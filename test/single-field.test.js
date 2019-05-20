const Store = require('../index');

describe('single field', () => {
  it('a single document', () => {
    const store = new Store();
    store.add({ Id: 1, Code: 'aaa', Name: 'quick brown fox' });

    expect(store.search('fox')).toMatchSnapshot();
  });

  it('multiple documents', () => {
    const store = new Store();
    store.add({ Id: 1, Code: '1', Name: 'The quick brown fox' });
    store.add({ Id: 2, Code: '2', Name: 'The quick brown fox jumps over the lazy dog' });
    store.add({ Id: 3, Code: '3', Name: 'The quick brown fox jumps hahaha over the quick dog' });
    store.add({ Id: 4, Code: '4', Name: 'Brown fox hahaha brown dog' });

    expect(store.search('hahaha')).toMatchSnapshot();
  });
});

// { Id: 1, Code: 'aaa', Name: 'aaa bbb ccc' },
// { Id: 2, Code: 'bbb', Name: 'bbb ccc ddd' },
// { Id: 3, Code: 'ccc', Name: 'ccc ddd eee' },
