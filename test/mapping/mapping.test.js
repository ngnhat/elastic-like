/**
 * Created by ngnhat on Sun June 30 2019
 */
const { initMapping } = require('../../src/mapping');

describe('mapping', () => {
  it('empty', () => {
    expect(initMapping().toJS()).toEqual({});
  });

  it('without search_analyzer', () => {
    const mapping = initMapping({
      Code: { type: 'text', analyzer: 'standard' },
      Name: { type: 'text', analyzer: 'asciifolding' },
    }).toJS();

    expect(mapping).toEqual({
      Code: { type: 'text', analyzer: 'standard', search_analyzer: 'standard' },
      Name: { type: 'text', analyzer: 'asciifolding', search_analyzer: 'asciifolding' },
    });
  });

  it('without analyzer and search_analyzer', () => {
    const mapping = initMapping({
      Code: { type: 'text' },
    }).toJS();

    expect(mapping).toEqual({
      Code: { type: 'text', analyzer: 'standard', search_analyzer: 'standard' },
    });
  });

  it('analyzer is different search_analyzer', () => {
    const mapping = initMapping({
      Code: { type: 'text', analyzer: 'standard', search_analyzer: 'asciifolding' },
      Name: { type: 'text', analyzer: 'asciifolding', search_analyzer: 'standard' },
    }).toJS();

    expect(mapping).toEqual({
      Code: { type: 'text', analyzer: 'standard', search_analyzer: 'asciifolding' },
      Name: { type: 'text', analyzer: 'asciifolding', search_analyzer: 'standard' },
    });
  });

  it('analyzer is not exists', () => {
    const mapping = initMapping({
      Code: { type: 'text', search_analyzer: 'asciifolding' },
      Name: { type: 'text', search_analyzer: 'standard' },
    }).toJS();

    expect(mapping).toEqual({
      Code: { type: 'text', analyzer: 'standard', search_analyzer: 'asciifolding' },
      Name: { type: 'text', analyzer: 'standard', search_analyzer: 'standard' },
    });
  });
});
