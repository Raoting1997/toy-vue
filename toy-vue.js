class ToyVue {
    constructor(config) {
        this.template = document.querySelector(config.el);
        this.data = reactive(config.data);

        for (let methodName in config.methods) {
            this[methodName] = () => {
                config.methods[methodName].apply(this.data);
            }
        }

        this.traversal(this.template);
    }

    traversal(node) { // 模板部分()
        if (node.nodeType === Node.TEXT_NODE) { // 主要为了识别 text_node 部分
            if (node.textContent.trim().match(/^{{([\s\S]+)}}$/)) {
                let name = RegExp.$1.trim();
                // 将模板字符串与数据做绑定(可更新的单向绑定)
                effect(() => node.textContent = this.data[name]);
                console.log(name);
            }
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            let attributes = node.attributes;

            for (let attr of attributes) {
                if (attr.name === 'v-model') {
                    // 输入框中的文字与数据做双向绑定
                    // 包括：data 里的数据同步到 input 中，input 的数据同步到 data 中
                    effect(() => node.value = this.data[attr.value]);
                    node.addEventListener('input', event => {
                        this.data[attr.value] = event.target.value;
                    });
                }

                if (attr.name.match(/^v\-bind:([\s\S]+)$/)) {
                    let attrName = RegExp.$1;
                    let name = attr.value;

                    effect(() => { node.setAttribute(attrName, this.data[name]) });
                }

                if (attr.name.match(/^v\-on:([\s\S]+)$/)) {
                    let eventName = RegExp.$1;
                    let funcName = attr.value;
                    node.addEventListener(eventName, this[funcName]);
                }
            }
        }

        if (node.childNodes && node.childNodes.length) {
            for (let child of node.childNodes) {
                this.traversal(child);
            }
        }
    }
}


let effects = new Map();
let currentEffect = null;

function effect(fn) {
    currentEffect = fn;
    fn();
    currentEffect = null;
}

function reactive(object) {
    // 通过 Proxy 包装的对象，获取属性时，都会经过 get 方法
    let observed = new Proxy(object, {
        get(obj, prop) {

            // 做依赖收集

            if (currentEffect) {
                if (!effects.has(obj)) {
                    effects.set(obj, new Map);
                }

                if (!effects.get(obj).has(prop)) {
                    effects.get(obj).set(prop, new Array);
                }

                effects.get(obj).get(prop).push(currentEffect);
            }
            return obj[prop];
        },
        set(obj, prop, value) {
            obj[prop] = value;

            if (effects.get(obj) && effects.get(obj).get(prop)) {
                let effectList = effects.get(obj).get(prop);

                for (let effect of effectList) {
                    effect();
                }
            }

            return true;
        }
    });

    return observed;
}

let o2 = reactive({ a: 1 });

let dummy;
let dummy1;
const counter = reactive({ num: 0 });

let dummy2;
const counter2 = reactive({ num: 0 });

effect(() => { dummy = counter.num });
effect(() => { dummy1 = counter.num + 1 });
effect(() => { dummy2 = counter2.num });
console.log(dummy, dummy1, dummy2);

counter.num = 7;
counter2.num = 3;

console.log(dummy, dummy1, dummy2, counter.num);

// effect 的用处：修改某一个属性，effect 函数就会被执行（在 reactive 里面执行：get 做绑定，set 里执行）


export { ToyVue };
