/**
 * Created by ngnhat on Thu July 04 2019
 */
const Store = require('../../index');

const store = new Store({
  docKey: 'id',
  mapping: {
    tweet: {
      properties: {
        message: { type: 'text' },
        lists: {
          properties: {
            name: { type: 'text' },
            description: { type: 'text' },
          },
        },
      },
    },
  },
});

store.add({
  id: 1,
  tweet: {
    message: 'some arrays in this tweet',
    lists: [{
      name: 'prog_list',
      description: 'programming list',
    }],
  },
});

store.add({
  id: 2,
  tweet: {
    message: 'wow, cool tweet!',
    lists: [{
      name: 'cool_list',
      description: 'cool stuff list',
    }],
  },
});

describe('properties', () => {
  it('', () => {
    expect(store.search({
      match: {
        query: 'cool',
        field: 'tweet.lists.description',
      },
    })).toEqual([{
      score: 0.64072428455121,
      source: {
        id: 2,
        tweet: {
          message: 'wow, cool tweet!',
          lists: [{
            name: 'cool_list',
            description: 'cool stuff list',
          }],
        },
      },
    }]);
  });
});
