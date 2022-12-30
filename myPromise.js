class myPromise {
  static PENDING = 'pending';
  static FULFILLED = 'fulfilled';
  static REJECTED = 'rejected';
  constructor(func) {
    this.PromiseState = myPromise.PENDING; 
    this.PromiseResult = null;
    this.onFulfilledCallbacks = []; // 保存成功回调
    this.onRejectedCallbacks = []; // 保存失败回调
    try {
      func(this.resolve.bind(this), this.reject.bind(this));
    } catch (error) {
      this.reject(error)
    }
  }
  resolve(result) {
    if (this.PromiseState === myPromise.PENDING) {
      this.PromiseState = myPromise.FULFILLED;
      this.PromiseResult = result;
      this.onFulfilledCallbacks.forEach(callback => {
        callback(result);
      })
    }
  }
  reject(reason) {
    if (this.PromiseState === myPromise.PENDING) {
      this.PromiseState = myPromise.REJECTED;
      this.PromiseResult = reason;
      this.onRejectedCallbacks.forEach(callback => {
        callback(reason);
      })
    }
  }
  then(onFulfilled, onRejected) {
    // onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
    // onRejected = typeof onRejected === 'function' ? onRejected : reason => {
    //   throw reason
    // }
    const promise2 = new myPromise((resolve, reject) => {
      if (this.PromiseState === myPromise.PENDING) {
        this.onFulfilledCallbacks.push(() => {
          setTimeout(() => {
            try {
              if (typeof onFulfilled !== 'function') {
                resolve(this.PromiseResult);
              } else {
                let x = onFulfilled(this.PromiseResult);
                resolvePromise(promise2, x, resolve, reject);
              }
            } catch (e) {
              reject(e);
            }
          });
        });
        this.onRejectedCallbacks.push(() => {
          setTimeout(() => {
            try {
              if (typeof onRejected !== 'function') {
                reject(this.PromiseResult);
              } else {
                let x = onRejected(this.PromiseResult);
                resolvePromise(promise2, x, resolve, reject);
              }
            } catch (e) {
              reject(e);
            }
          });
        });
      }
      if (this.PromiseState === myPromise.FULFILLED) {
        setTimeout(() => {
          try {
            if (typeof onFulfilled !== 'function') {
              resolve(this.PromiseResult);
            } else {
              let x = onFulfilled(this.PromiseResult);
              resolvePromise(promise2, x, resolve, reject);
            }
          } catch (e) {
            reject(e); //捕获前面onfulfilled抛出来的异常
          }
        })
      }
      if (this.PromiseState === myPromise.REJECTED) {
        setTimeout(() => {
          try {
            if (typeof onRejected !== 'function') {
              reject(this.PromiseResult);
            } else {
              let x = onRejected(this.PromiseResult);
              resolvePromise(promise2, x, resolve, reject);
            }
          } catch (e) {
            reject(e); //捕获前面onfulfilled抛出来的异常
          }
        })
      }
    })
    return promise2
  }
  catch(onRejected) {
    return this.then(undefined, onRejected);
  }
  finally(callback) {
    return this.then(callback, callback);
  }
  static resolve(value) {
    //如果这个值是一个promise，那么将返回这个promise
    if (value instanceof myPromise) {
      return value
    } else if (value instanceof Object && 'then' in value) { //如果这个值是一个then对象,返回的promise会“跟随”这个thenable的对象，采用它的最终状态；
      return new myPromise((resolve, reject) => {
        value.then(resolve, reject);
      })
    }

    //否则返回的promise将以此值完成，即以此值执行resolve方法（fulfilled状态）
    return new myPromise(resolve => {
      resolve(value);
    })
  }
  static reject(reason) {
    return new myPromise((resolve, reject) => {
      reject(reason)
    })
  }
  static all(promises) {
    return new myPromise((resolve, reject) => {
      if (Array.isArray(promises)) {
        const res = []; //存储结果
        let count = 0; //计数
        if (promises.length === 0) {
          return resolve(promises)
        }
        promises.forEach((item, index) => {
          //判断是否属于promise值与thenable对象
          //静态方法resolve已经判断所以直接使用
          myPromise.resolve(item).then(value => {
            count++
            res[index] = value;
            count === promises.length && resolve(res)
          }, reason => {
            reject(reason);
          })
        })
      } else {
        return reject(new TypeError('Argument is not a iterable'))
      }
    })
  }
  static allSettled(promises) {
    return new myPromise((resolve, reject) => {
      if (Array.isArray(promises)) {
        const res = [];
        let count = 0;
        if (promises.length === 0) {
          return resolve(promises)
        }
        promises.forEach((item, index) => {
          myPromise.resolve(item).then(
            value => {
              count++
              res[index] = {
                status: 'fulfilled',
                value
              }
              count === promises.length && resolve(res)
            }, 
            reason => {
              count++
              res[index] = {
                status: 'rejected',
                reason
              }
              count === promises.length && resolve(res)
            }
          )
        })
      } else {
        return reject(new TypeError('Argument is not a iterable'))
      }
    })
  }
  static any(promises) {
    return new myPromise((resolve, reject) => {
      if (Array.isArray(promises)) {
        const errors = [];
        let count = 0;
        if (promises.length === 0) {
          return reject(new AggregateError('All promises were rejected'))
        }
        promises.forEach(item => {
          myPromise.resolve(item).then(
            value => {
              resolve(value)
            },
            reason => {
              count++
              errors.push(reason)
              count === promises.length && reject(new AggregateError(errors))
            }
          )
        })
      } else {
        return reject(new TypeError('Argument is not a iterable'))
      }
    })
  }
  static race(promises) {
    return new myPromise((resolve, reject) => {
      if (Array.isArray(promises)) {
        if (promises.length > 0) {
          promises.forEach(item => {
            myPromise.resolve(item).then(resolve, reject);
          }) 
        }
      } else {
        return reject(new TypeError('Argument is not a iterable'))
      }
    })
  }
}

function resolvePromise(promise2, x, resolve, reject) {
  if (x === promise2) {
    throw new TypeError('Chaining cycle detected for promise');
  }

  if (x instanceof myPromise) {
    x.then(y => {
      resolvePromise(promise2, y, resolve, reject)
    }, reject);
  } else if (x !== null && ((typeof x === 'object' || (typeof x === 'function')))) {
    try {
      var then = x.then;
    } catch (e) {
      return reject(e);
    }

    if (typeof then === 'function') {
      let called = false;
      try {
        then.call(
          x,
          y => {
            if (called) return;
            called = true;
            resolvePromise(promise2, y, resolve, reject);
          },
          r => {
            if (called) return;
            called = true;
            reject(r);
          }
        )
      } catch (e) {
        if (called) return;
        called = true;
        reject(e);
      }
    } else {
      resolve(x);
    }
  } else {
    return resolve(x);
  }
}

let p1 = myPromise.race([1, 3, 4]);
setTimeout(() => {
    console.log('p1 :>> ', p1);
});

// 空数组，测试通过
let p2 = myPromise.race([]);
setTimeout(() => {
    console.log('p2 :>> ', p2);
});

const p11 = new myPromise((resolve, reject) => {
    setTimeout(resolve, 500, 'one');
});

const p22 = new myPromise((resolve, reject) => {
    setTimeout(resolve, 100, 'two');
});

// // 数组里有非Promise值，测试通过
myPromise.race([p11, p22, 10]).then((value) => {
    console.log('p3 :>> ', value);
    // Both resolve, but p22 is faster
});
// expected output: 10

// 数组里有'已解决的Promise' 和 非Promise值 测试通过
let p12 = myPromise.resolve('已解决的Promise')
setTimeout(() => {
    myPromise.race([p12, p22, 10]).then((value) => {
        console.log('p4 :>> ', value);
    });
    // expected output:已解决的Promise
});

// Promise.race的一般情况 测试通过
const p13 = new myPromise((resolve, reject) => {
    setTimeout(resolve, 500, 'one');
});

const p14 = new myPromise((resolve, reject) => {
    setTimeout(resolve, 100, 'two');
});

myPromise.race([p13, p14]).then((value) => {
    console.log('p5 :>> ', value);
    // Both resolve, but promise2 is faster
})

myPromise.deferred = function () {
  let result = {};
  result.promise = new myPromise((resolve, reject) => {
    result.resolve = resolve;
    result.reject = reject;
  })
  return result
}

module.exports = myPromise;