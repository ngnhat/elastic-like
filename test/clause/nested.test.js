/**
 * Created by ngnhat on Thu July 05 2019
 */
const Store = require('../../src');

describe('not nested testing', () => {
  it('not nested', () => {
    const store = new Store({
      mapping: {
        group: { type: 'text' },
        user: {
          properties: {
            last: { type: 'text' },
            first: { type: 'text' },
          },
        },
      },
    });

    store.add('doc001', {
      id: 1,
      group: 'fans',
      user: [
        { first: 'John', last: 'Smith' },
        { first: 'Alice', last: 'White' },
      ],
    });

    expect(store.search({
      bool: {
        must: [
          { match: { field: 'user.last', query: 'Smith' } },
          { match: { field: 'user.first', query: 'Alice' } },
        ],
      },
    })).toEqual([{
      score: 0.5753641449035617,
      source: {
        id: 1,
        group: 'fans',
        user: [
          { first: 'John', last: 'Smith' },
          { first: 'Alice', last: 'White' },
        ],
      },
    }]);
  });
});

describe('nested testing', () => {
  const store = new Store({
    mapping: {
      group: { type: 'text' },
      user: {
        type: 'nested',
        properties: {
          last: { type: 'text' },
          first: { type: 'text' },
        },
      },
    },
  });

  store.add('doc001', {
    id: 1,
    group: 'fans',
    user: [
      { first: 'John', last: 'Smith' },
      { first: 'Alice', last: 'White' },
    ],
  });

  it('nested without results', () => {
    expect(store.search({
      nested: {
        path: 'user',
        query: {
          bool: {
            must: [
              { match: { field: 'user.last', query: 'Smith' } },
              { match: { field: 'user.first', query: 'Alice' } },
            ],
          },
        },
      },
    })).toEqual([]);
  });

  it('nested with results', () => {
    expect(store.search({
      nested: {
        path: 'user',
        query: {
          bool: {
            must: [
              { match: { field: 'user.last', query: 'White' } },
              { match: { field: 'user.first', query: 'Alice' } },
            ],
          },
        },
      },
    })).toEqual([{
      score: 1.3862943611198906,
      source: {
        id: 1,
        group: 'fans',
        user: [
          { first: 'John', last: 'Smith' },
          { first: 'Alice', last: 'White' },
        ],
      },
    }]);
  });
});
