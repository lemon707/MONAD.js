// Douglas Crockford's MONAD implementation
// https://github.com/douglascrockford/monad/blob/master/monad.js

function MONAD(modifier) {
    'use strict';
    
    var prototype = Object.create(null);
    prototype.is_monad = true;
    
    function unit(value) {
        
        var monad = Object.create(prototype);
        
        monad.bind = function (func, args) {
            
            return func.apply(undefined,
            [value].concat(Array.prototype.slice.apply(args || []))
            );
            
        };
        
        if (typeof modifier === 'function') {
            value = modifier(monad, value);
        }
        
        return monad;
        
    }
    
    unit.lift_value = function (name, func) {
        
        prototype[name] = function () {
            return this.bind(func, arguments);
        };
        return unit;
        
    };
    
    unit.lift = function (name, func) {
        
        prototype[name] = function () {
            var result = this.bind(func, arguments);
            return (result && result.is_monad === true)
            ? result : unit(result)
        };
        
        return unit;
    };
    
    return unit;
}

// playing with examples - identity MONAD
var identity = MONAD();
var monad = identity("What is a MONAD?");
monad.bind(alert)

// playing with examples - ajax MONAD
var ajax = MONAD().lift('alert', alert);
console.log('ajax: ', ajax);
console.log('typeof ajax: ', typeof ajax);
var monad = ajax("MONADs are great, I say!");
console.log('monad: ', monad);
console.log('typeof monad: ', typeof monad);
monad.alert();

// playing with examples - maybe MONAD
// avoiding "null pointer exception"
var maybe = MONAD(function (monad, value) {
    if (value === null || value === undefined) {
        monad.is_null = true;
        monad.bind = function () {
            return monad;
        };
        return null;
    }
    return value;
});

var monad = maybe(null);
monad.bind(alert);

// playing with examples - promise MONAD
// promises are monads! Difference is that the value is not known when the monad is made.
// taken from Douglas Crockford's speech @ YUIConf https://www.youtube.com/watch?v=dkZFtimgAcM

// making a promise (an object) by making a vow

// var my_vow = VOW.make(); 
    // my_vow
    // .keep(value)
    // .break(reason)
    // .promise
    // .when(kept, broken)

// VOW function

var VOW = (function () {
    
   function enqueue(queue, func, resolver, breaker) {
       queue[queue.length] = typeof func !== 'function' ? resolver
       : function (value) {
           try {
               var result = func(value);
               if (result && result.is_promise === true) {
                   result.when(resolver, breaker);
               } else {
                   resolver(result);
               }
           } catch (e) {
               breaker(e);
           }
       }
   }
   
   function enlighten(queue, fate) {
       queue.forEach(function (func) {
           //setImmediate is a new feature that "does what setTimeout of zero should've done" but slower
           setImmediate(func, fate);
       })
   } 
    return {
        make: function make() {
            
            var breakers = [],
            fate,
            keepers = [],
            status = 'pending';
            
            function herald(state, value, queue) {
                if (status !== 'pending') {
                    throw "overpromise";
                }
                fate = value;
                status = state;
                enlighten(queue, fate);
                keepers.length = 0;
                breakers.length = 0;
            }
            return {
                break: function(value){
                    herald('broken', value, breakers);
                },
                keep: function keep(value) {
                    herald('kept', value, keeprs);
                },
                //the promise object!
                promise: {
                    is_promise: true,
                    when: function (kept, broken) {
                        var vow = make();
                        switch (status) {
                            case 'pending' :
                                enqueue(keepers, kept, vow.keep, vow.break);
                                enqueue(breakers, broken, vow.break, vow.break);
                                break;
                            case 'kept':
                                enqueue(keepers, kept, vow.keep, vow.break);
                                enlighten(keepers, fate);
                                break;
                            case 'broken':
                                enqueue(breakers, broken, vow.break, vow.break);
                                enlighten(breakers, fate);
                                break;
                        }
                        
                        return vow.promise;
                    }
                }
            }
        }
    };
}());

var my_vow = VOW.make(); 
    
// unless any promise breaks, failure will be caught at the end
// my_promise
//     .when(success_a)
//     .when(success_b)
//     .when(success_c, failure);
    