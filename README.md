### 背景
Promise是异步编程的一种解决方案，它可以解决异步回调地狱的问题，防止层层嵌套对程序代码带来的难维护性。既然带来了方便，我们就有必要学习它的原理以及底层实现，所以笔者就按照PromiseA+规范写了一个简单的Promise，并实现了Promise.all()，Promise.race()等API

### 实现过程
1.定义Promise，并传入一个需要执行的task函数，以及Promise中非常重要的三种状态
```
//定义Promise的三种状态
const PENDING =  'pending';
const FULFILLED =  'fulfilled';
const REJECTED =  'rejected';
function Promise(executor){}
```
2.设置默认状态，并定义成功和失败的回调函数数组（为了解决链式调用的问题）
```
 //设置默认状态
self.status = PENDING;
//存放成功的回调函数的数组
self.onResolvedCallbacks = [];
//定义存放失败回调函数的数组
self.onRejectedCallbacks = [];
```
3.定义成功和失败的回调函数实现
```
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
function reject(reason){
setTimeout(function(){
  if(self.status == PENDING){
    self.status = REJECTED;
    self.value = reason;
    self.onRejectedCallbacks.forEach(cb=>cb(self.value));
  }
});

}

```
4.实现then方法，这个很重要，就是异步任务执行成功调用then方法，依次走下去，避免了回调黑洞,其中resolvePromise严格按照[PromiseA+规范](https://promisesaplus.com/)第2.3条去实现
```
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
```
5.Promise.all方法用于将多个 Promise 实例，包装成一个新的 Promise 实例。只有所有实例的状态都变成fulfilled，最后的状态才会变成fulfilled，此时返回值组成一个数组，传递给最终的回调函数。
```
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
```
6.Promise.race方法同样是将多个 Promise 实例，包装成一个新的 Promise 实例。但是只要多个实例之中有一个实例率先改变状态，最终的状态就跟着改变。那个率先改变的 Promise 实例的返回值，就传递给最终的回调函数。
```
Promise.race = function(promises){
  return new Promise(function(resolve,reject){
    for(let i=0;i<promises.length;i++){
      promises[i].then(resolve,reject);
    }
  });
}
```

### 参考链接
1.[PromiseA+规范](https://promisesaplus.com/)
2.[PromiseA+](https://segmentfault.com/a/1190000002452115)
