# Breakdown

This document shows detail breakdown for every sections of the main program located in `main.js`.

## Import

`import` is a _keyword_ in ES6 syntax, is used to replace `require` with richer functionalities.

For example, to use the function `initializeApp` from Firebase, use:

```typescript
import { initializeApp } from "firebase/app";
```

`import` syntax allows we to import only the functionalities we need, and reduces the final bundled size.

```typescript
import "./style.css";
import { initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  QuerySnapshot,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { FirebaseConfig } from "./config";
```

## Objects

Not much to say here, just global object definitions.

```typescript
// objects
let todoList;
let db;
```

## On Load

As the name suggested, this function will be called after the document loaded.

`async` keyword is used to declare an _async function_, which will run asynchronously to the main thread and allows the usage of `await` keyword to wait for other _async functions_ and _Promises_.

```typescript
/**
 * The function gets called after document loaded
 */
const onLoad = async () => {
  // initialize the Firebase SDK
  initializeApp(FirebaseConfig);
  // referencing the Firestore instance
  db = getFirestore();

  // this is to show how to get a single collection
  await getFromFirebase();
  // onSnapshot will give the same data on subscribe
  subscribeToFirebase();

  // bind event listener for adding a new Todo
  document.querySelector("form").addEventListener("submit", addTodo);
};
```

## Render

In this demo app, rendering data into DOM, is done by invoking the following function. This function loop through every Todo object in the `todoList` and add some HTML to the `innerHTML` of the todo DOM element.

As for `querySelector` and `querySelectorAll`, please reference MDN.

- [Document.querySelector()](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector)
- [Document.querySelectorAll()](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll)

```typescript
/**
 * Function to rerender the todo element from the todoList object.
 */
const renderTodo = () => {
  // get element and make sure it's empty
  const todo = document.querySelector(".todos > ul");
  todo.innerHTML = "";

  // add all todoList object to the todo list element
  todoList.forEach((t) => {
    todo.innerHTML += `
    <li class="list-group-item">
      <div class="form-check">
        <input
          class="form-check-input"
          type="checkbox"
          id="${t.id}"
          ${t.checked ? "checked" : ""}
        />
        <label class="form-check-label" for="${t.id}">${
      t.checked ? `<strike>${t.context}</strike>` : t.context
    }</label>
      </div>
      <button type="button" class="btn btn-danger" id="delete-${
        t.id
      }">Delete</button>
    </li>`;
  });

  // bind event listener for all actions afterwards
  document
    .querySelectorAll('input[type="checkbox"]')
    .forEach((c) => c.addEventListener("change", onCheckChange));
  document
    .querySelectorAll("button.btn-danger")
    .forEach((b) => b.addEventListener("click", onDelete));
};
```

## Event Listeners

This section is defining event listeners for all the actions happening inside the web page.

- `onCheckChange` gets called while any checkbox has a value change, and find the represented object, change it's state and save it to Firestore (will review the logic for that later).
- `addTodo` gets invoked while `Enter` press on the textbox or the `Add` button clicked (they are inside the same form, and `addTodo` is listening a `SubmitEvent`). This function simply gets the new todo context and saves it to Firestore.
- `onDelete` gets triggered on any `Delete` button clicked. It will retrieve the `id` of the target `Todo` object, and delete it from Firestore.

```typescript
// <event listeners>
/**
 * Event listener gets called on checkbox changed.
 * @param {*} event
 */
const onCheckChange = (event) => {
  const target = todoList.find((t) => t.id === event.target.id);
  saveToFirebase({ ...target, checked: event.target.checked }, event.target.id);
};

/**
 * Event listener gets called on NewTodo form submit.
 * @param {*} event SubmitEvent
 */
const addTodo = (event) => {
  event.preventDefault();
  const val = event.target.querySelector("input").value;
  saveToFirebase({
    context: val,
    checked: false,
    timestamp: Timestamp.now(),
  });
};

/**
 * Event listener gets called on Delete button clicked.
 * @param {*} event
 */
const onDelete = (event) => {
  const todoId = event.target.id?.split("-")[1];
  if (!todoId) return;
  deleteFromFirebase(todoId);
};
```

## Firestore

Functions in this section are related to CRUD operations in Firestore.

`mapFirebaseDataToTodoList` is used to translate data from Firestore to render-able data for `renderTodo`. Destructuring is used to simplify the code, [learn more here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment).

```typescript
// <functions to query firestore>

/**
 * Map data from Firestore to render-able data.
 * @param {QuerySnapshot<*>} snapshot
 */
const mapFirebaseDataToTodoList = (snapshot) => {
  todoList = [];
  snapshot.forEach((todo) => {
    const { context, checked, timestamp } = todo.data();
    todoList.push({
      id: todo.id,
      context,
      checked,
      timestamp,
    });
  });
  todoList.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
  renderTodo();
};
```

`getFromFirebase` simply gets current data from Firestore once.

```typescript
/**
 * Get all data in a Firestore collection once.
 */
const getFromFirebase = async () => {
  const todoRes = await getDocs(collection(db, "todo-list"));
  mapFirebaseDataToTodoList(todoRes);
};
```

`saveToFirebase` save Todo to Firestore, it destructure the `Todo` object into `context`, `checked` and `timestamp`, which are stored in Firestore. If `id` is not given, this function assumes the `Todo` object is new, and use `addDoc` to create a new document in Firestore and randomly assigns a new `id` for it. Otherwise, use `setDoc` to update a `Todo` document.

```typescript
/**
 * Save data to Firestore, create if new, update if exist.
 * @param {{context: string, checked: boolean, timestamp: Timestamp}} todo todo object for Firestore
 * @param {string | null} id id of document
 */
const saveToFirebase = async ({ context, checked, timestamp }, id = null) => {
  const data = { context, checked, timestamp };
  if (id) {
    await setDoc(doc(db, "todo-list", id), data);
  } else {
    await addDoc(collection(db, "todo-list"), data);
  }
};
```

`deleteFromFirebase` takes the `id` of a `Todo` document, and use `deleteDoc` to delete it from the `todo-list` collection.

```typescript
/**
 * Delete a document by id.
 * @param {string | null} id id of document
 */
const deleteFromFirebase = async (id) => {
  if (!id) return;
  await deleteDoc(doc(db, "todo-list", id));
};
```

`subscribeToFirebase` is a little special, up until now, we had only showed off how normally CRUDs are done, but Firestore also supports realtime update through the Firebase SDK. To get the newest snapshot from Firestore, use the `onSnapshot` function, this function takes a document or collection to watch and multiple observer functions. The second argument or the first observer function, will get called if the document or the collection watching has updated. A new snapshot will be passed into the observer function. The `onSnapshot` function returns a `Unsubscribe` function, which can be called to unsubscribe from the updates.

Here, we simply take the new snapshot and plotted it straight into the mapping function and render it to our web page.

```typescript
/**
 * Subscribe changes in Firestore.
 */
const subscribeToFirebase = () => {
  /** **NOTICE**
   * `onSnapshot` will return a Unsubscribe function,
   * if you are using a JavaScript framework, you MUST
   * call the Unsubscribe function during the component
   * teardown stage to avoid unwanted side-effects.
   */
  onSnapshot(
    collection(db, "todo-list"),
    (next) => mapFirebaseDataToTodoList(next),
    (error) => console.error(error)
  );
};
```

Notice that, you need to pay extra attention while using the `onSnapshot` function, if you are using a SPA (Single Page Application) framework like Angular, React, Svelte, Vue ...etc, **MAKE SURE TO UNSUBSCRIBE DURING THE COMPONENT TEARDOWN STAGE** to avoid memory leak and unwanted side-effects.

- Component Tear Down Stage:
  - Angular: `onDestroy()`
  - React (Function component): return value of `useEffect`
  - React (Class component): `componentWillUnmount()`
  - Svelte: `onDestroy()`
  - Vue 2/3: `beforeDestroy()` / `beforeUnmount()`
  - Vue 3 (Composition API): `onBeforeUnmount()`

## Finally

Trigger the `onLoad` function and kickstart the application.

```typescript
// Invoke the on load function at the end.
onLoad();
```
