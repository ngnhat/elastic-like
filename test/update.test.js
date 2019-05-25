/**
 * Created by ngnhat on Sat May 25 2019
 */
const Store = require('../index');

describe('update a document:', () => {
  it('non exists', () => {
    const store = new Store();
    store.update({ Id: 1, Code: 'aaa', Name: 'quick brown fox' });

    expect(store.search('fox')).toMatchSnapshot();
  });

  it('exists', () => {
    const store = new Store();

    store.add({ Id: 1, Code: 'aaa', Name: 'quick brown fox' });
    store.update({ Id: 1, Code: 'abc', Name: 'quick fox updated.' });

    expect(store.search('aaa')).toEqual([]);
    expect(store.search('brown')).toEqual([]);
    expect(store.search('updated')).toMatchSnapshot();
  });
});
