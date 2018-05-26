module.exports = function() {
  const mock = {
    ok: true,
    text: _ => '456'
  };

  return Promise.resolve(mock);
}; 
