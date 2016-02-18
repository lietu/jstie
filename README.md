# JSTie

Tie down your objects to DOM. Yet another two-way data binding library.

Tie tries to be simple, to the point, and fast. Is not trying to save the world,
or cure cancer, and will not impose application structure, or a framework on you.
 
Tie was mostly done for fun, could be useful for real needs as well.

Uses `Object.createProperty` to replace all properties in your objects, 
recursively, which may or may not be something you like. Just waiting for that
`Proxy` -support to be implemented in browsers.


## Usage examples

Tie depends on both HTML attributes to tell it what to bind and where, and JS
objects to actually contain the data.
 
First, let's start with the HTML for a simple user form:

```html
<form class="user">
    <h2>User #<span data-tie="text: id"></span></h2>

    <div>
        <label for="name">Name</label>
        <input id="name" data-tie="value: name">
    </div>
    <div>
        <label for="street">Street</label>
        <input id="street" data-tie="value: address.street">
    </div>
    <div>
        <label for="country">Name</label>
        <input id="country" data-tie="value: address.country">
    </div>
    <button data-tie="click: sayHi">Say "Hi!"</button>
</form>
```

Notice the `data-tie` -attributes? They tell what DOM `property` to bind to
which object `path`.

To actually do the binding we'll need some JavaScript still:

```javascript
var user = {
    id: 1,
    name: "John Doe",
    address: {
        street: "Examplestreet 1",
        country: "Utopia"
    },
    sayHi: function() {
        alert("Hi, " + user.name + "!");
    }
};

var tie = new Tie(user, document.querySelector(".user"));
```

Now the JavaScript `user` object and the HTML elements are bound together, and
updates to one will be reflected to the other.

The `examples/test_example.html` -file has full sourcecode for this specific
example.


## Advanced use

The returned `tie` instance provides a few methods for advanced users.

### Tie.setData(Object)

Change the bound data object to another one and refresh all rendered values.

```
var user = {id: 1};
var user2 = {id: 2};

var tie = Tie(user, element);
tie.setData(user2);
```

### Tie.setRootElement(HTMLElement)

Change the root element we're bound to, clear old event listeners, and refresh
all rendered values.

```
var tie = Tie(user, document.querySelector("#form1"));
tie.setRootElement(document.querySelector("#form2));
```

### Tie.rebind()

Clean any old bindings, and re-bind all values, in case you've e.g. re-rendered
the HTML with your favorite HTML template rendering engine.

```
var tie = Tie(user, element);
// Change HTML
tie.rebind();
```

### Tie.clearListeners()

Don't need the `tie` anymore and want to prevent memory leaks? This will clear
the event listeners added during binding. You can always `.rebind()` later if
you feel like it.

```
var tie = Tie(user, element);
tie.clearListeners();
```


## Building for yourself

Want to contribute? Just playing around? Clone this repo and run:

```
npm install -g grunt-cli
npm install
grunt
```
