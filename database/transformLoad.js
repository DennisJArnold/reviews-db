const csv = require('csv-parser');
const fs = require('fs');
const { Client } = require('pg');
const db = require('./queries.js');

// Regex 'you've' => 'you\'ve'
const find = (/(.)'(.)/gm);
const replace = (`$1\'\'$2`);

const client = new Client({
  user: 'dennis',
  password: '',
  port: 5432,
  database: 'reviewsdb'
})

// client.connect()
// .then(()=> console.log('Database Connected!'))
// .then(() => {
//   fs.createReadStream('/Users/dennis/Documents/HackReactor/SDCData/reviews.csv')
//   .pipe(parse())
//   .on('data', (row) => {
//     for ( let i = 0; i < row.length; i++) {
//       row[i] = row[i].replace(find, replace);
//     }
//     client.query(`INSERT INTO reviews (id, product_id, rating, date, summary, body, recommend, reported, reviewer_name, reviewer_email, response, helpfulness) 
//    VALUES ('${row[0]}', '${row[1]}','${row[2]}','${row[3]}','${row[4]}','${row[5]}','${row[6]}','${row[7]}','${row[8]}','${row[9]}','${row[10]}','${row[11]}')`, (err, results) => {
//       if (err) {
//         console.log('AT ID: ', row[0]);
//         console.error(err);
//       } else {
//         console.log(row[0], 'inserted!');
//         console.log(results)
//         row = undefined;
//         results = undefined;
//         delete(results);
//         delete(row);
//         delete(err);
//       }
//     })
//   })
//   .on('end', () => {
//     console.log('DataLoaded!');
//   })
// })
// .catch(e => console.log(e));

const insert = (row) => {
  client.query(`INSERT INTO reviews (id, product_id, rating, date, summary, body, recommend, reported, reviewer_name, reviewer_email, response, helpfulness) 
  VALUES ('${row.id}', '${row.product_id}','${row.rating}','${row.date}','${row.summary.replace(find, replace)}','${row.body.replace(find, replace)}','${row.recommend}','${row.reported}','${row.reviewer_name}','${row.reviewer_email}','${row.response.replace(find, replace)}','${row.helpfulness}')`, (err) => {
    if (err) {
      console.error(err, 'within INSERT');
    } else {
    }
  })
}

client.connect()
 .then(()=> console.log('Database Connected!'))
 .then(() => {
    fs.createReadStream('/Users/dennis/Documents/HackReactor/SDCData/reviews.csv')
    .pipe(csv())
    .on('data', (row) => {
      try {
        insert(row);
      }
      catch(err) {
        console.log(err, 'ON DATA PIPE')
      }
    })
    .on('end', () => {
      console.log('LOAD COMPLETE!!!!!!');
    })
 })
