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

store.add(1, {
  id: 1,
  tweet: {
    message: 'some arrays in this tweet',
    lists: [{
      name: 'prog_list',
      description: 'programming list',
    }],
  },
});

store.add(2, {
  id: 2,
  tweet: {
    message: 'wow, cool tweet!',
    lists: [{
      name: 'cool_list',
      description: 'cool stuff list',
    }],
  },
});

store.add(3, {
  id: 3,
  tweet: {
    message: 'aw, suck tweet!',
    lists: [{
      name: 'suck_list',
      description: 'suck stuff list',
    }, {
      name: 'not_nested',
      description: 'not nested list',
    }],
  },
});

describe('properties', () => {
  it('object', () => {
    expect(store.search({
      match: {
        query: 'cool',
        field: 'tweet.message',
      },
    })).toEqual([{
      score: 1.0596458894144547,
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

  it('array', () => {
    expect(store.search({
      match: {
        query: 'cool',
        field: 'tweet.lists.description',
      },
    })).toEqual([{
      score: 1.0596458894144547,
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

  it('not nested', () => {
    expect(store.search({
      bool: {
        must: [
          { match: { query: 'suck_list', field: 'tweet.lists.name' } },
          { match: { query: 'not nested', field: 'tweet.lists.description' } },
        ],
      },
    })).toEqual([{
      score: 2.370736812475978,
      source: {
        id: 3,
        tweet: {
          message: 'aw, suck tweet!',
          lists: [{
            name: 'suck_list',
            description: 'suck stuff list',
          }, {
            name: 'not_nested',
            description: 'not nested list',
          }],
        },
      },
    }]);
  });
});
