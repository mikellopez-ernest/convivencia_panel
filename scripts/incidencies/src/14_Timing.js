function createTimer_(label) {
  const start = Date.now();
  let last = start;

  return {
    mark: function(name) {
      const now = Date.now();
      console.log('[timer] ' + label + ' :: ' + name + ' +' + (now - last) + 'ms total=' + (now - start) + 'ms');
      last = now;
    },
    done: function() {
      console.log('[timer] ' + label + ' :: done total=' + (Date.now() - start) + 'ms');
    }
  };
}

