import { isFn, toLowerCase, get } from "react-core/util";
import { createRenderer } from "react-core/createRenderer";
import { render } from "react-fiber/scheduleWork";
import { updateMiniApp, _getApp } from "./utils";

var onEvent = /(?:on|catch)[A-Z]/;

function getEventUid(name, props) {
    var n = name.charAt(0) == "o" ? 2 : 5;
    var type = toLowerCase(name.slice(n));
    return props["data-" + type + "-uid"];
}
export function getCurrentPage() {
    return _getApp().page;
}
export let Renderer = createRenderer({
    render: render,
    updateAttribute(fiber) {
        let { props, lastProps } = fiber;
        let beaconId = props["data-beacon-uid"];
        let instance = fiber._owner; //clazz[instanceId];
        if (instance && !instance.classUid) {
            instance = get(instance)._owner;
        }
        if (instance && beaconId) {
            var cached =
                instance.$$eventCached || (instance.$$eventCached = {});
            for (let name in props) {
                if (onEvent.test(name) && isFn(props[name])) {
                    let code = getEventUid(name, props);
                    cached[code] = props[name];
                    cached[code + "Fiber"] = fiber;
                }
            }
            if (lastProps) {
                for (let name in lastProps) {
                    if (onEvent.test(name) && !props[name]) {
                        let code = getEventUid(name, lastProps);
                        delete cached[code];
                        delete cached[code + "Fiber"];
                    }
                }
            }

        }
    },

    updateContent(fiber) {
        fiber.stateNode.props = fiber.props;
    },

    onAfterRender(fiber) {
        updateMiniApp(fiber.stateNode);
    },
    onDispose(fiber) {
        var instance = fiber.stateNode;
        var wx = instance.wx;
        if (wx) {
            wx.reactInstance = null;
            instance.wx = null;
        }
    },
    createElement(fiber) {
        return fiber.tag === 5
            ? {
                type: fiber.type,
                props: fiber.props || {},
                children: []
            }
            : {
                type: fiber.type,
                props: fiber.props
            };
    },
    insertElement(fiber) {
        let dom = fiber.stateNode,
            parentNode = fiber.parent,
            forwardFiber = fiber.forwardFiber,
            before = forwardFiber ? forwardFiber.stateNode : null,
            children = parentNode.children;

        try {
            if (before == null) {
                //要插入最前面
                if (dom !== children[0]) {
                    remove(children, dom);
                    dom.parentNode = parentNode;
                    children.unshift(dom);
                }
            } else {
                if (dom !== children[children.length - 1]) {
                    remove(children, dom);
                    dom.parentNode = parentNode;
                    var i = children.indexOf(before);
                    children.splice(i + 1, 0, dom);
                }
            }
        } catch (e) {
            throw e;
        }
    },
    emptyElement(fiber) {
        let dom = fiber.stateNode;
        let children = dom && dom.children;
        if (dom && Array.isArray(children)) {
            children.forEach(Renderer.removeElement);
        }
    },
    removeElement(fiber) {
        if (fiber.parent) {
            var parent = fiber.parent;
            var node = fiber.stateNode;
            node.parentNode = null;
            remove(parent.children, node);
        }
    }
});

function remove(children, node) {
    var index = children.indexOf(node);
    if (index !== -1) {
        children.splice(index, 1);
    }
}
