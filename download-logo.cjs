const fs = require('fs');
const https = require('https');

const urls = [
  'https://storage.googleapis.com/static.run.app/v1/shlfhs5rkp4vshpiteu3i5/input_file_2.png',
  'https://storage.googleapis.com/static.run.app/v1/shlfhs5rkp4vshpiteu3i5/input_file_1.png',
  'https://storage.googleapis.com/static.run.app/v1/shlfhs5rkp4vshpiteu3i5/input_file_0.png'
];

function tryDownload(index) {
  if (index >= urls.length) {
    console.error('Could not download any image');
    process.exit(1);
  }
  
  const url = urls[index];
  console.log('Trying', url);
  
  https.get(url, (res) => {
    if (res.statusCode === 200) {
      const file = fs.createWriteStream('public/logo.png');
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('Successfully downloaded to public/logo.png');
      });
    } else {
      console.log('Failed with status', res.statusCode);
      tryDownload(index + 1);
    }
  }).on('error', (err) => {
    console.error('Error:', err.message);
    tryDownload(index + 1);
  });
}

tryDownload(0);
