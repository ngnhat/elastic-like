/**
 * Created by ngnhat on Thu July 05 2019
 */
const Store = require('../../index');

describe('not nested', () => {
  it('not nested', () => {
    const store = new Store({
      docKey: 'id',
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

    store.add({
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
      score: 0.5753642,
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

describe('nested', () => {
  it('nested', () => {
    const store = new Store({
      docKey: 'id',
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

    store.add({
      id: 1,
      group: 'fans',
      user: [
        { first: 'John', last: 'Smith' },
        { first: 'Alice', last: 'White' },
      ],
    });

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
});
