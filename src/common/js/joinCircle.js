/*
 * 方法调用代理
 * 1. 对 callback 回调进行包装，以更加方便的形式调用，自动处理参数列表
 * 2. 生成二次 callback 时的参数列表（即：当前  callback 作为参数传入另一个方法中作为 callback）：
 *    function(x, callback, ...) {
 *      doSomething(x + 10, callback, ...);
 *    }
 */
function invoker(fn, args, off) {
  this.fn = (Object.prototype.toString.call(fn) === '[object Function]' ? fn : null);
  this.args = (args.length > off ? Array.prototype.slice.call(args, off) : null);

  /*
   * 调用回调，并自动传入参数列表
   */
  this.invoke = function() {
    if(this.fn) {
      var args = arguments;

      if(this.args) {
        for(var i in this.args) {
          Array.prototype.push.call(args, this.args[i]);
        }
      }

      this.fn.apply(null, args);
    }
  }

  /*
   * 将原参数列表，附加在 callback 参数列表之后，并返回新的参数列表
   */
  this.appendArgs = function() {
    var args = arguments;

    if(this.args) {
      for(var i = this.args.length - 1; i >= 0; i --) {
        Array.prototype.splice.call(args, 0, 0, this.args[i]);
      }
    }

    if(this.fn)
      Array.prototype.splice.call(args, 0, 0, this.fn);

    return args;
  }

  /*
   * 在原参数列表之后，附加 callback 参数列表，并返回新的参数列表
   */
  this.prependArgs = function() {
    var args = arguments;

    if(this.fn)
      Array.prototype.push.call(args, this.fn);

    if(this.args) {
      for(var i in this.args) {
        Array.prototype.push.call(args, this.args[i]);
      }
    }

    return args;
  }
}

var timer = 0;
var validStatus = false;
function clearStatus(addGroup){
  timer = window.setTimeout(function () {
    window.clearTimeout(timer);
    timer = 0;
    addGroup = 2;
  },2000);
}
/**
 * 处理付费类型的入群操作
 */
function joinOnPay(joinOnPayUrl,userId,followerId,circleId,liveId,liveName){
  var url = joinOnPayUrl + "?";
  url += "circleId=" + circleId;
  url += "&userId=" + userId;
  url += "&liveId=" + liveId;
  url += "&liveName=" + liveName;
  url += "&bizType=joinCirclePay";
  url += "&liveChargeCallback=" + encodeURIComponent(window.location.href);
  url += "&followerId=" + followerId == undefined ? '' : followerId;
  window.location.href = url;
}
/**
 * 处理会员类型的入群操作
 */
function joinOnVip(joinOnVipUrl,userId,followerId,circleId,liveId){
  var url = joinOnVipUrl + "?";
  url += "userId=" + userId;
  url += "&circleId=" + circleId;
  url += "&liveId=" + liveId;
  url += "&noJoin=0";
  url += "&liveChargeCallback=" + encodeURIComponent(window.location.href);
  url += "&followerId=" + followerId == undefined ? '' : followerId;
  window.location.href = url;
}
/**
 * 加群事件函数
 */
export function joinEvent(userId,followerId,circleId,join,liveId,liveName,cb){
  if(timer!=0){
    return;
  }
  if(userId == undefined || userId == ""){
    var auth = new oauth();
    auth.init("", 1);
    return auth.auth();
  }else{
    hasJoinAuth('/api/v2/circle/member/validation',userId,circleId,followerId,join,liveId,liveName,cb);
  }
}
/**
 * 执行加群操作
 */
function doJoin(url,circleId,userId,followerId,join,cb){
  var addGroup,popuText,authStatus
  var fn = new invoker(cb, arguments, 6);
  var type = 109;
  if(join == 1 || join == 2){
    type = 101;
  }
  if (validStatus) {
    utils.ajax({
      url:url,
      data:{'circleId':circleId,'followerId':followerId,'type':type},
      type:"put",
      success:function (data) {
        if (data.code == 0) {
          if(join == 2 || join==1){
            authStatus = 2;
            console.log("加群成功 ，join="+join);
          }else{
            authStatus = 0;
            addGroup = 1
            clearStatus(addGroup);
          }
        } else if (data.code == "16021") {//提示文案： 已加入该社群
          addGroup = -1;
          popuText = '已加入该社群';
        } else if (data.code == "16022") {//提示文案：群成员已满
          addGroup = -1;
          popuText = '群成员已满';
        } else if (data.code == "16062") {//提示文案:  您已被社群加入黑名单,不能加入该社群
          addGroup = -1;
          popuText = '您已被社群加入黑名单,不能加入该社群';
        } else {
          addGroup = 0;
          clearStatus(addGroup);
        }
        fn.invoke(addGroup, popuText, authStatus);
      },
      error: function (err) {
        var code = err.status;
        var text = err.statusText;
      }
    });
  }
}
/**
 * 判断用户是否有入群资格
 */
function hasJoinAuth(joinAuthUrl,userId,circleId,followerId,join,liveId,liveName,cb){
  console.log("hasJoinAuth方法：join="+join);
  var addGroup, popuText;
  var fn = new invoker(cb, arguments, 7);
  utils.ajax({
    url:joinAuthUrl+"?circleId="+circleId,
    type:'GET',
    success:function (data) {
        var joinstate = data.code;
        var joinMsg = data.message;
        if (joinstate != 0) {
          if (joinstate == 16051) {//加群资格
            console.log("joinstate="+joinstate);
            var url = '/zhangmen/community/qualified/list' + '?';
            url += 'userId=' + userId;
            url += '&type=1&bizId=' + circleId;
            url += '&fromUrl=' + encodeURIComponent(window.location.href);
            window.location.href = url;
          }else if(joinstate == 16022){
            console.log("joinstate="+joinstate);
            addGroup = -1;
            popuText = "群成员已满";
          } else {
            console.log("joinstate="+joinstate);
            addGroup = 0;
            popuText = '加群失败！';
            clearStatus(addGroup);
          }
          fn.invoke(addGroup, popuText, 0);
        } else {//通过加群资格验证：
          console.log("joinstate="+joinstate);
          validStatus = true;
          switch (join) {
            case 8:// 入群类型为 会员入群
              joinOnVip('/vip/'+circleId+'/product/list',userId,followerId,circleId,liveId);
              break;
            case 4:// 入群类型为 付费入群
              joinOnPay('/zhangmen/circle/circle-pay',userId,followerId,circleId,liveId,liveName);
              break;
            default://其它入群方式
              doJoin('/api/v2/w/circle/member/',circleId,userId,followerId,join,cb);
              break;
          }
        }
    },
    error:function (e) {
      console.log(e);
    }
  });
}
