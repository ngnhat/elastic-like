/**
 * Created by ngnhat on Mon July 15 2019
 */
const Analysis = require('../../src/analysis');

describe('ngram', () => {
  it('normal ngram', () => {
    const analysisConfig = {
      tokenizer: {
        ngram_tokenizer: {
          min_gram: 3,
          max_gram: 4,
          type: 'ngram',
          token_chars: ['letter', 'digit', 'whitespace'],
        },
      },
      analyzer: {
        ngram_analyzer: {
          tokenizer: 'ngram_tokenizer',
        },
      },
    };
    const analysis = new Analysis(analysisConfig);

    expect(analysis.getTerms('ngram_analyzer', 'có dấu')).toEqual([
      'có ',
      'có d',
      'ó d',
      'ó dấ',
      ' dấ',
      ' dấu',
      'dấu',
    ]);
  });

  it('asciifolding ngram', () => {
    const analysisConfig = {
      tokenizer: {
        ngram_tokenizer: {
          min_gram: 4,
          max_gram: 5,
          type: 'ngram',
          token_chars: ['letter', 'digit', 'whitespace'],
        },
      },
      analyzer: {
        ngram_analyzer: {
          filter: ['asciifolding'],
          tokenizer: 'ngram_tokenizer',
        },
      },
    };
    const analysis = new Analysis(analysisConfig);

    expect(analysis.getTerms('ngram_analyzer', 'Không có dấu')).toEqual([
      'khon',
      'khong',
      'hong',
      'hong ',
      'ong ',
      'ong c',
      'ng c',
      'ng co',
      'g co',
      'g co ',
      ' co ',
      ' co d',
      'co d',
      'co da',
      'o da',
      'o dau',
      ' dau',
    ]);
  });
});
