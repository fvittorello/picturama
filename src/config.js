let dotAnsel = `${process.env.HOME}/.ansel`;

if (process.env.ANSEL_DEV_MODE)
  dotAnsel = `${process.env.INIT_CWD}/dot-ansel`;

export default {
  characters: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZéè',
  acceptedRawFormats: [ 'raf', 'cr2', 'arw', 'dng' ],
  watchedFormats: /([\$\#\w\d]+)-([\$\#\w\dèé]+)-(\d+)\.(JPEG|JPG|PNG|PPM)/i,
  dotAnsel,
  dbFile: `${dotAnsel}/db.sqlite3`,
  thumbsPath: `${dotAnsel}/thumbs`,
  thumbs250Path: `${dotAnsel}/thumbs-250`,
  tmp: '/tmp/ansel'
};
