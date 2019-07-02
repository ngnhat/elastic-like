/**
 * Created by ngnhat on Sat May 25 2019
 */
const Store = require('../../index');

describe('multiple fields', () => {
  it('multiple documents', () => {
    const store = new Store({
      docKey: 'Id',
      mapping: {
        Code: { type: 'text', analyzer: 'standard' },
        Name: { type: 'text', analyzer: 'standard' },
      },
    });

    store.add({ Id: 1, Code: 'aaa', Name: 'aaa bbb ccc' });
    store.add({ Id: 2, Code: 'bbb', Name: 'bbb ccc ddd' });
    store.add({ Id: 3, Code: 'ccc', Name: 'ccc ddd eee' });
    store.add({ Id: 4, Code: 'ddd', Name: 'ddd eee fff' });

    expect(store.search({
      bool: {
        should: [
          { match: { query: 'ccc', field: 'Code' } },
          { match: { query: 'ccc', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();
    expect(store.search({
      bool: {
        should: [
          { match: { query: 'eee', field: 'Code' } },
          { match: { query: 'eee', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();
    expect(store.search({
      bool: {
        should: [
          { match: { query: 'fff', field: 'Code' } },
          { match: { query: 'fff', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();
  });

  it('multiple documents - multiple terms', () => {
    const store = new Store({
      docKey: 'Id',
      mapping: {
        Code: { type: 'text', analyzer: 'standard' },
        Name: { type: 'text', analyzer: 'standard' },
      },
    });

    store.add({ Id: 1, Code: 'aaa', Name: 'aaa bbb ccc' });
    store.add({ Id: 2, Code: 'bbb', Name: 'bbb ccc ddd' });
    store.add({ Id: 3, Code: 'ccc', Name: 'ccc ddd eee' });
    store.add({ Id: 4, Code: 'ddd', Name: 'ddd eee fff' });

    expect(store.search({
      bool: {
        should: [
          { match: { query: 'bbb aaa', field: 'Code' } },
          { match: { query: 'bbb aaa', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();
    expect(store.search({
      bool: {
        should: [
          { match: { query: 'ccc fff', field: 'Code' } },
          { match: { query: 'ccc fff', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();
  });
});
