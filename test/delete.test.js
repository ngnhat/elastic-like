/**
 * Created by ngnhat on Sat May 25 2019
 */
const Store = require('../index');

describe('single field:', () => {
  it('single doc - single term', () => {
    const store = new Store();

    store.add({ Id: 1, Code: 'aaa', Name: 'quick brown fox' });
    store.delete(1);

    expect(store.search('fox')).toEqual([]);
  });

  it('multiple doc - single term', () => {
    const store1 = new Store();
    const store2 = new Store();

    store1.add({ Id: 1, Code: '1', Name: 'The quick brown fox' });
    store1.add({ Id: 2, Code: '2', Name: 'The quick brown fox jumps over the lazy dog' });
    store1.add({ Id: 4, Code: '4', Name: 'Brown fox hahaha brown dog' });

    store2.add({ Id: 1, Code: '1', Name: 'The quick brown fox' });
    store2.add({ Id: 2, Code: '2', Name: 'The quick brown fox jumps over the lazy dog' });
    store2.add({ Id: 3, Code: '3', Name: 'The quick brown fox jumps hahaha over the quick dog' });
    store2.add({ Id: 4, Code: '4', Name: 'Brown fox hahaha brown dog' });
    store2.delete(3);

    expect(store1.search('hahaha')).toEqual(store2.search('hahaha'));
    expect(store2.search('hahaha')).toMatchSnapshot();
  });
});
