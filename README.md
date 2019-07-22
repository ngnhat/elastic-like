# elastic-like
Full text search library for Browser

## Install

With yarn

```shell
$ yarn add elastic-like
```

or alternatively using npm:

```shell
$ npm install --save elastic-like
```

## Basic Usage

```javascript
const ElasticLike = require('elastic-like');

const el = new ElasticLike({
  mapping: {
    name: { type: 'text', analyzer: 'standard' },
  },
});

el.add(1, { id: 1, name: 'aaa bbb ccc' });
el.add(2, { id: 2, name: 'ddd eee fff' });

const results = el.search({
  match: { query: 'aaa ccc', field: 'name' },
});
// [
//   {
//     score: 1.3862943611198906,
//     source: { id: 1, name: 'aaa bbb ccc' },
//   }
// ]
```
