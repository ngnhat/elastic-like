/**
 * Created by ngnhat on Sat May 25 2019
 */
const B = 0.75;
const K1 = 1.2;

const bm25Scoring = ({ idf, freq, dl, avgdl } = {}) => (
  idf * freq * (K1 + 1) / (freq + K1 * (1 - B + B * dl / avgdl))
);

module.exports = bm25Scoring;
