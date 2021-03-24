const { Client } = require('pg')
const client = new Client({
  user: 'postgres',
  password: 'postgres',
  database: 'reviewsdb'
})

client.connect()
.then(()=> console.log('Database Connected!'))
.catch(e => console.log(e));

const getAllReviews = (id, cb) => {
  client.query(`SELECT * FROM reviews WHERE product_id=${id}`, (err, results) => {
    if (err) {
      cb(err, null);
    } else {
      cb(null, results);
    }
  })
}

const getReviewsByPage = (id, count, page, sort, cb) => {
  let offset = page * count;
  if (sort === 'relevant') sort = 'helpfulness DESC, date DESC';
  else if(sort === 'newest') sort = 'date DESC';
  else if(sort === 'helpful') sort = 'helpfulness DESC';
  client.query(
    `SELECT reviews.reviews_id AS reviews_id,
    reviews.product_id,
    reviews.rating,
    reviews.date,
    reviews.summary,
    reviews.body,
    reviews.recommend,
    reviews.reported,
    reviews.reviewer_name,
    reviews.reviewer_email,
    reviews.response,
    reviews.helpfulness,
    jsonb_agg(jsonb_build_object('url', photos.url)) AS photos
    FROM reviews
    LEFT OUTER JOIN photos ON reviews.reviews_id = photos.review_id
    WHERE product_id=${id}
    GROUP BY reviews.reviews_id
    ORDER BY ${sort} 
    LIMIT ${count} 
    OFFSET ${offset}`, 
    (err, results) => {
      if (err) {
        cb(err, null);
      } else {
        cb(null, results.rows);
      }
    })
}

const insertReview = (review, cb) => {
  let { product_id, name, summary, body, rating, recommend } = review;
  let date = JSON.stringify(new Date());
  
  client.query(`INSERT INTO reviews (product_id, reviewer_name, summary, body, date, rating, recommend, helpfulness) VALUES ('${product_id}', '${name}', '${summary}', '${body}', '${date}', '${rating}', '${recommend}', ${0}) RETURNING reviews_id`, (err, results) => {
    if (err) {
      cb(err, null);
    } else {
      let reviewId = results.rows[0].reviews_id;
      let valueString = ''
      review.photos.forEach((photo) => {
        valueString += ',(' + reviewId + ',' + photo + ')';
      })
      valueString = valueString.slice(2);
      if (valueString !== '') {
        client.query(`INSERT INTO photos (review_id, url) VALUES (${reviewId}, ${photo})`, (err, results) => {
          if (err) {
            cb(err, null);
          } else {
            cb(null, results);
          }
        })
      }
      valueString = '';
      for ( let key in review.characteristics) {
        valueString += ',(' + key + ',' + reviewId + ',' + review.characteristics[key] + ')';
      }
      valueString = valueString.slice(2);
      if (valueString !== '') {
        client.query(`INSERT INTO reviews_characteristics (characteristic_id, review_id, value) VALUES(${valueString}`)
      }
      cb(null, results);
    }
  })
}

// mark helpful (reviewID)
const markHelpful = (id, cb) => {
  client.query(`UPDATE reviews SET helpfulness = helpfulness + 1 WHERE reviews_id =${id}`, (err, results) => {
    if (err) {
      cb(err, null);
    } else {
      cb(null, results);
    }
  })
}

// report review (reviewID)
const reportReview = (id, cb) => {
  client.query(`UPDATE reviews SET reported= true WHERE reviews_id =${id}`, (err, results) => {
    if (err) {
      cb(err, null);
    } else {
      cb(null, results);
    }
  })
}

// get reviews meta (reviewID)
const getReviewsMeta = (id, cb) => {
  let meta = {}
  meta.characteristics = {};
  meta.product_id = id;
  meta.ratings = {};
  meta.recommended = {};
  client.query(`
  SELECT reviews.reviews_id AS id,
  reviews.product_id,
  reviews.rating,
  reviews.recommend,
  jsonb_agg(jsonb_build_object(
    'id', reviews_characteristics.rev_char_id,
    'name', characteristics.characteristic_name,
    'value', reviews_characteristics.value
    )) AS characteristic_vals
  FROM reviews
  LEFT OUTER JOIN reviews_characteristics ON reviews.reviews_id = reviews_characteristics.review_id
  LEFT OUTER JOIN characteristics ON reviews_characteristics.characteristic_id = characteristics.char_id
  WHERE reviews.product_id=${id}
  GROUP BY reviews.reviews_id
  `, (err, results) => {
    if (err) {
      cb(err, null);
    } else {
      let avgCounters = {};
      let avgSums = {}
      results.rows.forEach((row) => {
        meta.ratings[row.rating] = meta.ratings[row.rating] + 1 || 1;
        meta.recommended[row.recommend] = meta.recommended[row.recommend] + 1 || 1;
        row.characteristic_vals.forEach((char) => {
          meta.characteristics[char.name] = char;
          avgSums[char.name] = avgSums[char.name] + char.value || char.value;
          avgCounters[char.name] = avgCounters[char.name] + 1 || 1;
        })
      })
      for (let key in meta.characteristics) {
        meta.characteristics[key].value = avgSums[key]/avgCounters[key];
      }
      cb(null, meta);
    }
  })
}

module.exports = {
  getAllReviews,
  getReviewsByPage,
  insertReview,
  markHelpful,
  getReviewsMeta, 
  reportReview
}