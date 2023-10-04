// accessKeyId: 'AKIAWCLFTPQMPJZP6I7F',
// secretAccessKey: 'UN5HcEFUo67zmLBLiEbNMym2jZCR56JMrwUThz7a',

const { S3Client } = require('@aws-sdk/client-s3')
// Configure your AWS credentials and region here
const s3Client = new S3Client({
  region: 'ap-south-1',
  credentials: {
    accessKeyId: 'AKIAWCLFTPQMPJZP6I7F',
    secretAccessKey: 'UN5HcEFUo67zmLBLiEbNMym2jZCR56JMrwUThz7a'
  },
})

module.exports = s3Client
