const Store = require('../index');

describe('single field:', () => {
  it('single doc - single term', () => {
    const store = new Store();
    store.add({ Id: 1, Code: 'aaa', Name: 'quick brown fox' });

    expect(store.search('fox')).toMatchSnapshot();
  });

  it('single doc - multiple term', () => {
    const store = new Store();
    store.add({ Id: 1, Code: 'aaa', Name: 'quick brown fox' });

    expect(store.search('quick fox')).toMatchSnapshot();
  });

  it('multiple doc - single term', () => {
    const store = new Store();
    store.add({ Id: 1, Code: '1', Name: 'The quick brown fox' });
    store.add({ Id: 2, Code: '2', Name: 'The quick brown fox jumps over the lazy dog' });
    store.add({ Id: 3, Code: '3', Name: 'The quick brown fox jumps hahaha over the quick dog' });
    store.add({ Id: 4, Code: '4', Name: 'Brown fox hahaha brown dog' });

    expect(store.search('hahaha')).toMatchSnapshot();
  });
});
