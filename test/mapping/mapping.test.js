/**
 * Created by ngnhat on Sun June 30 2019
 */
const initMapping = require('../../src/mapping');

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

  it('multiple fields', () => {
    const mapping = initMapping({
      name: {
        type: 'text',
        analyzer: 'standard',
        fields: {
          folded: {
            type: 'text',
            analyzer: 'asciifolding',
          },
          standard_folded: {
            type: 'text',
            search_analyzer: 'asciifolding',
          },
          folded_standard: {
            type: 'text',
            analyzer: 'asciifolding',
            search_analyzer: 'standard',
          },
        },
      },
    }).toJS();

    expect(mapping).toEqual({
      name: {
        type: 'text',
        analyzer: 'standard',
        search_analyzer: 'standard',
        fields: {
          folded: {
            type: 'text',
            analyzer: 'asciifolding',
            search_analyzer: 'asciifolding',
          },
          standard_folded: {
            type: 'text',
            analyzer: 'standard',
            search_analyzer: 'asciifolding',
          },
          folded_standard: {
            type: 'text',
            analyzer: 'asciifolding',
            search_analyzer: 'standard',
          },
        },
      },
    });
  });

  it('properties mapping', () => {
    const mapping = initMapping({
      tweet: {
        properties: {
          message: {
            type: 'text',
          },
          tags: {
            type: 'text',
          },
          lists: {
            properties: {
              name: {
                type: 'text',
              },
              description: {
                type: 'text',
              },
            },
          },
        },
      },
    }).toJS();

    expect(mapping).toEqual({
      tweet: {
        properties: {
          message: {
            type: 'text',
            analyzer: 'standard',
            search_analyzer: 'standard',
          },
          tags: {
            type: 'text',
            analyzer: 'standard',
            search_analyzer: 'standard',
          },
          lists: {
            properties: {
              name: {
                type: 'text',
                analyzer: 'standard',
                search_analyzer: 'standard',
              },
              description: {
                type: 'text',
                analyzer: 'standard',
                search_analyzer: 'standard',
              },
            },
          },
        },
      },
    });
  });

  it('properties mapping', () => {
    const mapping = initMapping({
      group: { type: 'text' },
      user: {
        type: 'nested',
        properties: {
          last: { type: 'text' },
          first: { type: 'text' },
        },
      },
    }).toJS();

    expect(mapping).toEqual({
      group: {
        type: 'text',
        analyzer: 'standard',
        search_analyzer: 'standard',
      },
      user: {
        type: 'nested',
        properties: {
          last: {
            type: 'text',
            analyzer: 'standard',
            search_analyzer: 'standard',
          },
          first: {
            type: 'text',
            analyzer: 'standard',
            search_analyzer: 'standard',
          },
        },
      },
    });
  });

  it('invalid mapping', () => {
    try {
      initMapping({
        name: {
          type: 'text',
          analyzer: 'standard',
          fields: {
            folded: {
              type: 'text',
              analyzer: 'asciifolding',
            },
          },
        },
        'name.folded': {
          type: 'text',
          analyzer: 'standard',
        },
      }).toJS();
    } catch (err) {
      expect(err).toEqual(new Error('[Mapping Parsing Exception]: name.folded'));
    }
  });
});
