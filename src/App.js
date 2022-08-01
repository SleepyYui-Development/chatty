import React, { useRef, useState } from 'react';
import './App.css';

import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';
import 'firebase/analytics';

import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';

firebase.initializeApp({
  // google api key stuff
})

const auth = firebase.auth();
const firestore = firebase.firestore();
// const analytics = firebase.analytics();


function App() {

  const [user] = useAuthState(auth);

  return (
    <div className="App">
      <header>
        <h1>Chatty - Besser als Facebook</h1>
        <SignOut />
      </header>
      <section>
        {user ? <ChatRoom /> : <SignIn />}
      </section>
    </div>
  );
}

function SignIn() {

  const signInWithGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    //auth.signInWithPopup(provider);
    firebase.auth()
    .signInWithPopup(provider)
    .then((result) => {
      /** @type {firebase.auth.OAuthCredential} */
      let email = result.user.email;
      const usersRef = firestore.collection('bannedusers');
      let query = usersRef.orderBy('bannedusers')
      const [bannedTokens] = useCollectionData(query, { idField: 'id' });
      const bannedEmails = bannedTokens.map(message => message.uid);
      alert({bannedEmails});
      if (!bannedEmails.includes(email)) {
        return;
      }
      else {
        auth.signOut();
        alert('Du wurdest gebannt.');
        return;
      }
    })
  }

  const signInAnonymously = () => {
    auth.signInAnonymously();
  }

  return (
    <>
      <button className="sign-in" onClick={signInWithGoogle}>Mit Google anmelden</button>
      <br/>
      <button className="sign-in" onClick={signInAnonymously}>Anonym anmelden und mitlesen</button>
    </>
  )

}

function SignOut() {
  return auth.currentUser && (
    <button className="sign-out" onClick={() => auth.signOut()}>Abmelden</button>
  )
}


function ChatRoom() {
  const dummy = useRef();
  const messagesRef = firestore.collection('messages');
  const usersRef = firestore.collection('bannedusers');
  let query = messagesRef.orderBy('createdAt').limitToLast(25);

  const [messages] = useCollectionData(query, { idField: 'id' });
  const [formValue, setFormValue] = useState('');


  const sendMessage = async (e) => {


    /* if (formValue.trim() === '') return;
    if (formValue.trim() === ' ') return;
    if (formValue.length > 1024) {
      alert('Bitte schreibe kürzere Nachrichten. Um spam zu vermeiden wurdest du abgemeldet.');
      auth.signOut();
      return;
    } */

    // if the last 7 messages are from the same user his account will be blocked
    if (messages.length > 6) {
      let last7 = messages.slice(messages.length - 7, messages.length);
      let last7Users = last7.map(message => message.uid);
      // if every entry of last7users is uid
      if (last7Users.every(uid => uid === last7Users[0])) {
        auth.currentUser.delete();
        let email = auth.currentUser.email;
        await usersRef.add({
          email,
          bannedAt: firebase.firestore.FieldValue.serverTimestamp(),
        })
        //alert('Du wurdest wegen spamming gebannt.');
        return;
      }
    }







    e.preventDefault();

    const { uid, photoURL, displayName } = auth.currentUser;

    await messagesRef.add({
      text: formValue,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      uid,
      photoURL,
      displayName
    })

    setFormValue('');
    dummy.current.scrollIntoView({ behavior: 'smooth' });
  }


  if (!auth.currentUser || !auth.currentUser.isAnonymous) {
    return (<>
      <main>
        {messages && messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
        <span ref={dummy}></span>
      </main>
      <form onSubmit={sendMessage}>
        <input value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder="Nachricht an Chatty" />
        <button type="submit" disabled={!formValue}>Senden</button>
      </form>
    </>)
  }
  else {
    return (<>
      <main>
        {messages && messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
        <span ref={dummy}></span>
      </main>
    </>)
  }
}


function ChatMessage(props) {
  const { text, uid, photoURL} = props.message;

  const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';

  return (<>
    <div className={`message ${messageClass}`}>
      <img src={photoURL || 'https://api.adorable.io/avatars/23/abott@adorable.png'} alt="Avatar"/>
      <p>
        {text}
      </p>
    </div>
  </>)
}


export default App;
