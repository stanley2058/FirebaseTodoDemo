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

// objects
let todoList;
let db;

/**
 * The function gets called after document loaded
 */
const onLoad = async () => {
  initializeApp(FirebaseConfig);
  db = getFirestore();

  // this is to show how to get a single collection
  await getFromFirebase();
  // onSnapshot will give the same data on subscribe
  subscribeToFirebase();

  document.querySelector("form").addEventListener("submit", addTodo);
};

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

/**
 * Get all data in a Firestore collection once.
 */
const getFromFirebase = async () => {
  const todoRes = await getDocs(collection(db, "todo-list"));
  mapFirebaseDataToTodoList(todoRes);
};

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

/**
 * Delete a document by id.
 * @param {string | null} id id of document
 */
const deleteFromFirebase = async (id) => {
  if (!id) return;
  await deleteDoc(doc(db, "todo-list", id));
};

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

onLoad();
