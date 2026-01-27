const storage = {};

const mock = {
  getItem: jest.fn(async (key) => (Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null)),
  setItem: jest.fn(async (key, value) => {
    storage[key] = value;
  }),
  removeItem: jest.fn(async (key) => {
    delete storage[key];
  }),
  clear: jest.fn(async () => {
    Object.keys(storage).forEach((key) => delete storage[key]);
  }),
  __setMockStorage: (data) => {
    Object.keys(storage).forEach((key) => delete storage[key]);
    Object.assign(storage, data);
  },
  __getMockStorage: () => ({ ...storage }),
};

module.exports = mock;
