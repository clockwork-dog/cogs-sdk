export default /** @type {const} */ ({
  name: 'Some Custom Content',
  icon: '',
  description: '',
  version: '1',
  config: [
    {
      name: 'foo',
      value: {
        type: 'number',
        default: 0,
      },
    },
    {
      name: 'Camera Feed 1',
      value: {
        type: 'string',
        default: 'rtsp://',
      },
    },
    {
      name: 'Bar',
      value: {
        type: 'option',
        options: ['hello', 'world'],
        default: 'hello',
      },
    },
  ],
  events: {
    fromCogs: [
      {
        name: 'Here is a number',
        value: {
          type: 'number',
        },
      },
      {
        name: 'Here is a string',
        value: {
          type: 'string',
        },
      },
      {
        name: 'Here is no value',
      },
    ],
    toCogs: [
      {
        name: 'Button Press',
        value: {
          type: 'boolean',
        },
      },
    ],
  },
  state: [
    {
      name: 'This can only be written from client',
      value: {
        type: 'option',
        options: ['Red', 'Green'],
        default: 'Red',
      },
      writableFromClient: true,
    },
    {
      name: 'Count',
      value: {
        type: 'number',
        default: 123,
      },
      writableFromCogs: true,
    },
    {
      name: 'Text entered',
      value: {
        type: 'string',
        default: '',
      },
      writableFromCogs: true,
    },
    {
      name: 'Text entered 2',
      value: {
        type: 'string',
        default: '',
      },
      writableFromCogs: true,
    },
  ],
});
