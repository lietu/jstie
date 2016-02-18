/**
 * Should we show debug messages? (for development purposes only)
 * @type {boolean}
 */
const DEBUG = false;

/**
 * Which HTML attribute are we using for binding rules
 * @type {string}
 */
const ATTRIBUTE = "data-tie";

/**
 * How to parse the single rules to their type + path -components
 * @type {RegExp}
 */
const PARSE_RULE = / *([^:]+ *): *([^ ]+) *$/;

/**
 * What event types can we listen to
 * @type {string[]}
 */
const CHANGE_EVENTS = ["change", "keyup"];

/**
 * What events are considered "clicks"?
 */
const CLICK_EVENTS = ["click"];

/**
 * List of events we're listening for and on which elements
 */
interface ListenerList {
    [index: string]: HTMLElement[];
}

/**
 * List of elements we're bound to for some specific reason
 */
interface BindingElements {
    [index: string]: HTMLElement[];
}

/**
 * List of paths and what they are bound to
 */
interface Bindings {
    [index: string]: BindingElements;
}

/**
 * Tie data objects to DOM elements.
 */
export class Tie {
    private rootElement: HTMLElement;
    private data: Object;
    private listeners: ListenerList;
    private bindings: Bindings;

    /**
     * Bound version of onEvent
     */
    private _onEvent: EventListener;

    /**
     * Create a new Tie
     * @param data Data to bind. OBJECT WILL BE MODIFIED!
     * @param element The root element
     */
    constructor(data: Object, element: HTMLElement) {
        let _this = this;

        _this._onEvent = _this.onEvent.bind(this);

        this.bindings = {};
        this.listeners = {};

        CHANGE_EVENTS.forEach(function (type) {
            _this.listeners[type] = [];
        });
        CLICK_EVENTS.forEach(function (type) {
            _this.listeners[type] = [];
        });

        this._setRootElement(element);
        this._setData(data);
        this.refresh();
    }

    /**
     * Set the data to bind. OBJECT WILL BE MODIFIED!
     * @param data
     */
    public setData(data: Object) {
        this._setData(data);
        this.refresh();
    }

    /**
     * Set the root element to base bindings to.
     * @param element
     */
    public setRootElement(element: HTMLElement) {
        this.clearListeners();
        this._setRootElement(element);
        this.refresh();

    }

    /**
     * Refresh all bindings, e.g. after re-rendering HTML.
     */
    public rebind() {
        this.clearListeners();
        this.bind();
        this.refresh();
    }

    /**
     * Remove all event listeners from the DOM
     */
    public clearListeners() {
        let listeners = this.listeners;
        let _this = this;
        let count = 0;
        let eventType;
        for (eventType in listeners) {
            if (!listeners.hasOwnProperty(eventType)) {
                continue;
            }
            listeners[eventType].forEach(function (element) {
                count += 1;
                element.removeEventListener(eventType, _this._onEvent);
            });
        }

        if (DEBUG) {
            console.log("Cleared " + count + " listeners");
        }
    }

    /**
     * Update the values to all DOM bindings
     */
    public refresh() {
        if (DEBUG) {
            console.log("Refreshing all bindings");
        }

        for (let path in this.bindings) {
            if (!this.bindings.hasOwnProperty(path)) {
                continue;
            }
            this.updatePath(path);
        }
    }

    /**
     * Actually set the data to bid, without refreshing.
     * @param data
     * @private
     */
    private _setData(data) {
        if (DEBUG) {
            console.log("Setting data", data);
        }
        this.data = data;
        this.wrap(data, "");
    }

    /**
     * Actually set the root element, without refreshing.
     * @param element
     * @private
     */
    private _setRootElement(element: HTMLElement) {
        if (element === this.rootElement) {
            return;
        }

        if (DEBUG) {
            console.log("Setting root element", element);
        }

        this.rootElement = element;

        this.rebind();
    }

    /**
     * "Wrap" an object so we get updates of
     * @param object
     */
    private wrap(object: Object, rootPath) {
        rootPath = rootPath ? rootPath : "";

        // TODO: Support Object.observe & Proxy
        if (DEBUG) {
            console.log("Wrapping '" + rootPath + "'", object);
        }

        for (let key in object) {
            if (!object.hasOwnProperty(key)) {
                continue;
            }

            let value = (<any>object)[key];
            let path = (rootPath === "" ? key : rootPath + "." + key);

            this.property(object, key, value, path);

            if (typeof value === "object") {
                this.wrap(value, path);
            }
        }
    }

    /**
     * Convert an object property into a property we can watch.
     * @param object
     * @param key
     * @param value
     */
    private property(object: Object, key: string, value: any, path: string) {
        let _this = this;
        Object.defineProperty(object, key, {
            get: function (): any {
                return value;
            },

            set: function (newValue: any) {
                if (newValue !== value) {
                    value = newValue;

                    _this.updatePath(path);
                }
            },
        });
    }

    /**
     * Get notified of a DOM change. DO NOT USE DIRECTLY, USE _onEvent, WHICH
     * IS BOUND TO "this".
     * @param event
     */
    private onEvent(event: Event) {
        let element: HTMLElement = <HTMLElement>event.target;
        let type = event.type;
        let path = element.getAttribute(ATTRIBUTE + "-on-" + type);

        if (DEBUG) {
            console.log("Got '" + type + "' event for '" + path + "'");
        }

        switch (type) {
            case "keyup":
            case "change":
                this.setValue(path, this.getValue(element));
                break;

            case "click":
                this.onClick(path, event);
        }
    }

    private onClick(path: string, event: Event) {
        if (DEBUG) {
            console.log("Relaying click to '" + path + "'");
        }

        let ret = this.findPath(path);
        ret.obj[ret.key](event);
    }

    /**
     * Set any value to the given path of the data object
     * @param path
     * @param value
     */
    private setValue(path: string, value: any) {
        if (DEBUG) {
            console.log("Updating value of '" + path + "'", value);
        }

        let ret = this.findPath(path);
        // Take the last part and assign value
        ret.obj[ret.key] = value;
    }

    /**
     * Find the last part of the path + the remaining key, so assignments work
     * nicely.
     *
     * @param path
     * @returns {{obj: Object, key: string}}
     */
    private findPath(path: string) {

        let parts = path.split(".");
        let obj = this.data;

        // Parse through the object tree through the path, leaving last level
        let i = 0, max = parts.length - 1;
        for (; i < max; i += 1) {
            obj = obj[parts[i]];
        }

        return {
            key: parts[max],
            obj: obj,
        };
    }

    /**
     * Get the value assigned to an element
     * @param element
     * @returns
     */
    private getValue(element: any) {
        return element.value;
    }

    /**
     * Set up all DOM bindings
     */
    private bind() {
        if (DEBUG) {
            console.log("Setting up DOM bindings");
        }

        let elements = Array.prototype.slice.call(this.rootElement.querySelectorAll("[" + ATTRIBUTE + "]"));

        elements.forEach(this.processElement.bind(this));
    }

    /**
     * Set up bindings for a single element
     * @param element
     */
    private processElement(element: HTMLElement) {
        let rules = element.getAttribute(ATTRIBUTE).split(",");

        let _this = this;
        rules.forEach(function (rule) {
            _this.parseRule(element, rule);
        });
    }

    /**
     * Parse a single rule in an element into bindings definitions
     * @param element
     * @param rule
     */
    private parseRule(element: HTMLElement, rule: string) {
        let parts = PARSE_RULE.exec(rule);
        let type = parts[1];
        let path = parts[2];

        if (!this.bindings[path]) {
            this.bindings[path] = {};
        }

        if (!this.bindings[path][type]) {
            this.bindings[path][type] = [];
        }

        if (DEBUG) {
            console.log("Bound '" + type + "' of '" + path + "'", element);
        }

        this.bindings[path][type].push(element);
    }

    /**
     * Update DOM values to a single property path's current value
     * @param path
     */
    private updatePath(path: string) {
        if (DEBUG) {
            console.log("Updating elements bound to '" + path + "'");
        }

        let ret = this.findPath(path);
        let value = ret.obj[ret.key];

        let _this = this;
        
        let type;
        for (type in this.bindings[path]) {
            if (!this.bindings[path].hasOwnProperty(type)) {
                continue;
            }
            this.bindings[path][type].forEach(function (element) {
                _this.updateElementFromPath(element, path, type, value);
            });
        }
    }

    /**
     * Update a single element from the given path
     * @param element
     * @param path
     * @param type
     * @param value
     */
    private updateElementFromPath(element: any, path: string, type: string, value: any) {
        switch (type) {
            case "text":
                element.innerText = element.textContent = value;
                break;

            case "html":
                element.innerHTML = value;
                break;

            case "value":
                element.value = value;
                this.listenToChanges(element, path);
                break;

            case "click":
                this.listenForClicks(element, path);
                break;

            default:
                throw new Error("Tried to set '" + path + "' to unsupported '" + type + "' of an element");
        }
    }

    /**
     * Listen to changes on an element
     * @param element
     * @param path
     */
    private listenToChanges(element: HTMLElement, path: string) {
        if (DEBUG) {
            console.log("Listening to events for '" + path + "'", element);
        }

        let _this = this;

        CHANGE_EVENTS.forEach(function (event) {
            element.addEventListener(event, _this._onEvent);
            _this.listeners[event].push(element);
            element.setAttribute(ATTRIBUTE + "-on-" + event, path);
        });
    }

    /**
     * Listen to clicks on an element
     * @param element
     * @param path
     */
    private listenForClicks(element: HTMLElement, path: string) {
        if (DEBUG) {
            console.log("Listening to clicks for '" + path + "'", element);
        }

        let _this = this;

        CLICK_EVENTS.forEach(function (event) {
            element.addEventListener(event, _this._onEvent);
            _this.listeners[event].push(element);
            element.setAttribute(ATTRIBUTE + "-on-" + event, path);
        });
    }
}
