//定义Promise的三种状态
const PENDING =  'pending';
const FULFILLED =  'fulfilled';
const REJECTED =  'rejected';
function Promise(executor){
  //缓存promise实例 以免后续this指针改变
  let self = this;
  //设置默认状态
  self.status = PENDING;
  //存放成功的回调函数的数组
  self.onResolvedCallbacks = [];
  //定义存放失败回调函数的数组
  self.onRejectedCallbacks = [];
  //When fulfilled, a promise:
//must not transition to any other state.
//must have a value, which must not change.
  function resolve(value){ 
    if(value!=null &&value.then&&typeof value.then == 'function'){
      return value.then(resolve,reject);
    }
    // This can be implemented with either a “macro-task” mechanism such as setTimeout or setImmediate, or with a “micro-task” mechanism such as MutationObserver or process.nextTick. Since the promise implementation is considered platform code
    setTimeout(function(){
      if(self.status == PENDING){
        self.status = FULFILLED;
        self.value = value;
        self.onResolvedCallbacks.forEach(cb=>cb(self.value));
      }
    })

  }
//  When rejected, a promise:
// must not transition to any other state.
// must have a reason, which must not change.
  function reject(reason){ //2.1.2
    setTimeout(function(){
      if(self.status == PENDING){
        self.status = REJECTED;
        self.value = reason;
        self.onRejectedCallbacks.forEach(cb=>cb(self.value));
      }
    });

  }

  //执行传入promise的函数并捕捉异常信息 传给reject
  try{
    executor(resolve,reject);
  }catch(e){
    reject(e);
  };
}
function resolvePromise(promise2,x,resolve,reject){
  if(promise2 === x){
    return reject(new TypeError('构成循环引用'));
  }
  //promise2是否已经resolve 或reject了
  let called = false;
  if(x instanceof Promise){
    if(x.status == PENDING){
      x.then(function(y){
        resolvePromise(promise2,y,resolve,reject);
      },reject);
    }else{
      x.then(resolve,reject);
    }
  //x是一个thenable对象或函数，只要有then方法的对象，
  }else if(x!= null &&((typeof x=='object')||(typeof x == 'function'))){
   try{
     let then = x.then;
     if(typeof then == 'function'){
       then.call(x,function(y){
          if(called)return;
          called = true;
          resolvePromise(promise2,y,resolve,reject)
       },function(err){
         if(called)return;
         called = true;
         reject(err);
       });
     }else{
       //x不是一个thenable对象
       resolve(x);
     }
   }catch(e){
     if(called)return;
     called = true;
     reject(e);
   }

  }else{
    resolve(x);
  }
}
//onFulfilled 是用来接收promise成功的值或者失败的原因
Promise.prototype.then = function(onFulfilled,onRejected){
  onFulfilled = typeof onFulfilled == 'function'?onFulfilled:function(value){return  value};
  onRejected = typeof onRejected == 'function'?onRejected:reason=>{throw reason};
  let self = this;
  let promise2;
  if(self.status == FULFILLED){
    return promise2 = new Promise(function(resolve,reject){
      setTimeout(function(){
        try{
          let x =onFulfilled(self.value);
          resolvePromise(promise2,x,resolve,reject);
        }catch(e){
          reject(e);
        }
      })

    });
  }
  if(self.status == REJECTED){
    return promise2 = new Promise(function(resolve,reject){
      setTimeout(function(){
        try{
          let x =onRejected(self.value);
          resolvePromise(promise2,x,resolve,reject);
        }catch(e){
          reject(e);
        }
      })
    });
  }
  if(self.status == PENDING){
   return promise2 = new Promise(function(resolve,reject){
     self.onResolvedCallbacks.push(function(){
         try{
           let x =onFulfilled(self.value);
           //如果获取到了返回值x,会走解析promise的过程
           resolvePromise(promise2,x,resolve,reject);
         }catch(e){
           reject(e);
         }

     });
     self.onRejectedCallbacks.push(function(){
         try{
           let x =onRejected(self.value);
           resolvePromise(promise2,x,resolve,reject);
         }catch(e){
           reject(e);
         }
     });
   });
  }

}
//catch原理就是只传失败的回调
Promise.prototype.catch = function(onRejected){
  this.then(null,onRejected);
}
Promise.deferred = Promise.defer = function(){
  let defer = {};
  defer.promise = new Promise(function(resolve,reject){
    defer.resolve = resolve;
    defer.reject = reject;
  });
  return defer;
}
function gen(times,cb){
  let result = [],count=0;
  return function(i,data){
    result[i] = data;
    if(++count==times){
      cb(result);
    }
  }
}
Promise.all = function(promises){
 return new Promise(function(resolve,reject){
   let done = gen(promises.length,resolve);
   for(let i=0;i<promises.length;i++){
     promises[i].then(function(data){
       done(i,data);
     },reject);
   }
 });
}
Promise.race = function(promises){
  return new Promise(function(resolve,reject){
    for(let i=0;i<promises.length;i++){
      promises[i].then(resolve,reject);
    }
  });
}
module.exports = Promise;