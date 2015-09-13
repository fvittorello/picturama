import {spawn} from 'child-process-promise';
import Promise from 'bluebird';
import fs from 'fs';
import Walk from 'walk';
import {ExifImage} from 'exif';
import moment from 'moment';
import watchr from 'watchr';
import sharp from 'sharp';
import exifJs from 'exif-js';

import Photo from './models/photo';
import Version from './models/version';

var acceptedRawFormats = [ 'RAF', 'CR2' ];
var acceptedImgFormats = [ 'JPG', 'JPEG', 'PNG' ];

var path = process.env.PWD + '/photos/';
var versionsPath = process.env.PWD + '/versions/';
var thumbsPath = process.env.PWD  + '/thumbs/';

class Library {

  constructor(mainWindow) {
    this.mainWindow = mainWindow;
  }

  walk(root, fileStat, next) {
    let allowed = new RegExp(acceptedRawFormats.join("$|") + '$', "i");
    let extract = new RegExp('(.+)\.(' + acceptedRawFormats.join("|") + ')$', "i");

    if (fileStat.name.match(allowed)) {
      let filename = fileStat.name.match(extract)[1];


      return spawn('dcraw', [ '-e', path + fileStat.name ]).then((data) => {
        new ExifImage({ image: path + filename + '.thumb.jpg' }, (err, exifData) => {
          var createdAt = moment(exifData.image.ModifyDate, 'YYYY:MM:DD HH:mm:ss')
          console.log('created at', createdAt);

          sharp(path + filename + '.thumb.jpg')
            .rotate()
            .toFile(thumbsPath + filename + '.thumb.jpg')
            .then((image) => {
              return new Photo({ title: filename, created_at: createdAt.toDate() }).fetch();
            })
            .then((photo) => {
              if (photo)
                throw 'alredy-existing';
              else
                return Photo.forge({
                  title: filename,
                  extension: fileStat.name.match(/\.(.+)$/i)[1],
                  orientation: exifData.image.Orientation,
                  date: createdAt.format('YYYY-MM-DD'),
                  created_at: createdAt.toDate(),
                  exposure_time: exifData.exif.ExposureTime,
                  iso: exifData.exif.ISO,
                  aperture: exifData.exif.FNumber,
                  focal_length: exifData.exif.FocalLength,
                  master: path + fileStat.name,
                  thumb: thumbsPath + filename + '.thumb.jpg'
                }).save();
            })
            .then((photo) => {
              next();
            })
            .catch(function(err) {
              console.log('ERR', err);
              next();
            });
        });
      }).catch(function(err) {
        console.log('ERR', err);
        next();
      });

      //cmd.stdout.on('data', (data) => {
      //  console.log('stdout: ' + data);
      //});

      //cmd.stderr.on('data', (data) => {
      //  console.log('stderr: ' + data);
      //});

      //cmd.on('exit', (code) => {
      //  new ExifImage({ image: path + filename + '.thumb.jpg' }, (err, exifData) => {
      //    var createdAt = moment(exifData.image.ModifyDate, 'YYYY:MM:DD HH:mm:ss')

      //    fsRename(path + filename + '.thumb.jpg', thumbsPath + filename + '.thumbs.jpg')
      //      .then(() => {
      //        return new Photo({ title: filename, created_at: createdAt.toDate() }).fetch();
      //      })
      //      .then((photo) => {
      //        if (photo)
      //          throw 'alredy-existing';
      //        else
      //          return Photo.forge({
      //            title: filename,
      //            extension: fileStat.name.match(/\.(.+)$/i)[1],
      //            orientation: exifData.image.Orientation,
      //            date: createdAt.format('YYYY-MM-DD'),
      //            created_at: createdAt.toDate(),
      //            exposure_time: exifData.exif.ExposureTime,
      //            iso: exifData.exif.ISO,
      //            aperture: exifData.exif.FNumber,
      //            focal_length: exifData.exif.FocalLength,
      //            master: path + fileStat.name,
      //            thumb: thumbsPath + filename + '.thumbs.jpg'
      //          }).save();
      //      })
      //      .then((photo) => {
      //        next();
      //      })
      //      .catch((err) => {
      //        console.log('err', err);
      //        next();
      //      });
      //  });
      //});
    } else next();
  }

  scan() {
    console.log('SCAN', path);
    var walker = Walk.walk(path, { followLinks: false });

    walker.on("file", this.walk);

    walker.on("errors", (root, nodeStatsArray, next) => {
    }); // plural

    walker.on("end", () => {
      console.log('done');
    });
  }

  watch() {
    var self = this;
    var allowed = /([\w\d]+)-([\w\d]+)-(\d+)\.(JPEG|JPG|PNG|PPM)/i

    watchr.watch({
      paths: [ path, versionsPath, thumbsPath ],

      listener: (action, filePath) => {
        console.log('listen now', action, filePath);

        // on action:create then parse file and update version
        if ((action == 'create' || action == 'update') && filePath.match(allowed)) {
          Version.updateImage(filePath.match(allowed)).then(function(version) {
            console.log('version done', version);

            if (version)
              self.mainWindow.webContents.send('new-version', version);
          });
        }
      }
    });
  }
}

export default Library;