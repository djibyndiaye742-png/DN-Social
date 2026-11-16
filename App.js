import "react-native-url-polyfill/auto";
import React, { useEffect, useState } from "react";
import {
View,
Text,
TextInput,
TouchableOpacity,
ScrollView,
StyleSheet,
StatusBar,
Alert,
ActivityIndicator
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";


// CONFIGURATION SUPABASE
const SUPABASE_URL = "TON_URL_SUPABASE";
const SUPABASE_ANON_KEY = "TA_CLE_PUBLIQUE_SUPABASE";


const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
auth: {
storage: AsyncStorage,
autoRefreshToken: true,
persistSession: true,
detectSessionInUrl: false
}
});


export default function App() {
const [session, setSession] = useState(null);
const [loading, setLoading] = useState(true);
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [username, setUsername] = useState("");
const [fullName, setFullName] = useState("");
const [isSignup, setIsSignup] = useState(false);
const [active, setActive] = useState("Accueil");
const [posts, setPosts] = useState([]);
const [newPost, setNewPost] = useState("");
const [busy, setBusy] = useState(false);


useEffect(() => {
supabase.auth.getSession().then(({ data }) => {
setSession(data.session);
setLoading(false);
});


const { data: listener } = supabase.auth.onAuthStateChange(
  (_event, newSession) => setSession(newSession)
);

return () => listener.subscription.unsubscribe();



}, []);


useEffect(() => {
if (session) loadPosts();
}, [session]);


async function authenticate() {
if (!email.trim() || !password.trim()) {
Alert.alert("DN Social", "Remplis ton email et ton mot de passe.");
return;
}


setBusy(true);

try {
  if (isSignup) {
    if (!username.trim() || !fullName.trim()) {
      Alert.alert("DN Social", "Remplis ton nom et ton nom d'utilisateur.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: username.trim(),
          full_name: fullName.trim()
        }
      }
    });

    if (error) throw error;

    if (data.user && data.session) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: data.user.id,
          username: username.trim(),
          full_name: fullName.trim()
        });

      if (profileError) throw profileError;
    }

    Alert.alert(
      "Bienvenue sur DN",
      "Inscription envoyée. Vérifie ton email si une confirmation est demandée."
    );
  } else {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) throw error;
  }
} catch (error) {
  Alert.alert("Erreur", error.message);
} finally {
  setBusy(false);
}



}


async function loadPosts() {
const { data, error } = await supabase
.from("posts")
.select("id, content, created_at, user_id")
.order("created_at", { ascending: false });


if (error) {
  Alert.alert("Erreur", error.message);
  return;
}

setPosts(data || []);



}


async function publishPost() {
if (!newPost.trim() || !session?.user) return;


setBusy(true);

const { error } = await supabase.from("posts").insert({
  user_id: session.user.id,
  content: newPost.trim(),
  media_type: "text"
});

setBusy(false);

if (error) {
  Alert.alert("Publication impossible", error.message);
  return;
}

setNewPost("");
loadPosts();



}


async function logout() {
await supabase.auth.signOut();
}


if (loading) {
return (


Préparation de DN Social...

);
}


if (!session) {
return (


DN.
Ton monde. Tes connexions.


    <View style={styles.authCard}>
      <Text style={styles.heading}>
        {isSignup ? "Rejoins DN" : "Bon retour !"}
      </Text>

      {isSignup && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Nom complet"
            value={fullName}
            onChangeText={setFullName}
          />
          <TextInput
            style={styles.input}
            placeholder="Nom d'utilisateur"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </>
      )}

      <TextInput
        style={styles.input}
        placeholder="Adresse email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={authenticate}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryText}>
            {isSignup ? "Créer mon compte" : "Se connecter"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsSignup(!isSignup)}>
        <Text style={styles.switchText}>
          {isSignup
            ? "J'ai déjà un compte · Se connecter"
            : "Nouveau sur DN ? · Créer un compte"}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);



}


return (




  <View style={styles.header}>
    <Text style={styles.logoSmall}>DN<Text style={styles.dot}>.</Text></Text>
    <TouchableOpacity onPress={logout}>
      <Text style={styles.logout}>Déconnexion</Text>
    </TouchableOpacity>
  </View>

  <ScrollView contentContainerStyle={styles.feed}>
    <Text style={styles.title}>Ton monde.</Text>
    <Text style={styles.tagline}>Tes idées. Tes connexions.</Text>

    <View style={styles.composer}>
      <Text style={styles.sectionTitle}>Créer une publication</Text>
      <TextInput
        style={styles.postInput}
        placeholder="Quoi de neuf aujourd'hui ?"
        value={newPost}
        onChangeText={setNewPost}
        multiline
      />
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={publishPost}
        disabled={busy}
      >
        <Text style={styles.primaryText}>Publier</Text>
      </TouchableOpacity>
    </View>

    <Text style={styles.sectionTitle}>Fil d'actualité</Text>

    {posts.map((post) => (
      <View key={post.id} style={styles.postCard}>
        <Text style={styles.postAuthor}>Membre DN</Text>
        <Text style={styles.postContent}>{post.content}</Text>
        <Text style={styles.postDate}>
          {new Date(post.created_at).toLocaleString()}
        </Text>
      </View>
    ))}

    {posts.length === 0 && (
      <Text style={styles.muted}>
        Aucune publication pour le moment. Lance la conversation !
      </Text>
    )}
  </ScrollView>

  <View style={styles.bottom}>
    {["Accueil", "Découvrir", "Créer", "Messages", "Profil"].map((tab) => (
      <TouchableOpacity
        key={tab}
        onPress={() => setActive(tab)}
        style={styles.navItem}
      >
        <Text style={[
          styles.navText,
          active === tab && styles.selected
        ]}>
          {tab}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
</View>



);
}


const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: "#F7F8FC" },
center: {
flex: 1,
alignItems: "center",
justifyContent: "center",
backgroundColor: "#F7F8FC"
},
authScreen: {
flex: 1,
justifyContent: "center",
padding: 22,
backgroundColor: "#F7F8FC"
},
authCard: {
backgroundColor: "#FFFFFF",
borderRadius: 20,
padding: 20,
marginTop: 30
},
logo: {
fontSize: 58,
fontWeight: "900",
color: "#14213D",
textAlign: "center"
},
logoSmall: {
fontSize: 30,
fontWeight: "900",
color: "#14213D"
},
dot: { color: "#2563EB" },
tagline: {
color: "#7B8496",
textAlign: "center",
marginTop: 5,
marginBottom: 10
},
heading: {
fontSize: 24,
fontWeight: "800",
color: "#14213D",
marginBottom: 20
},
input: {
backgroundColor: "#F3F5F9",
borderRadius: 12,
padding: 15,
marginBottom: 12,
color: "#14213D"
},
primaryButton: {
backgroundColor: "#2563EB",
padding: 15,
borderRadius: 12,
alignItems: "center",
marginTop: 8
},
primaryText: { color: "#FFFFFF", fontWeight: "800" },
switchText: {
textAlign: "center",
color: "#2563EB",
marginTop: 20,
fontWeight: "600"
},
header: {
height: 62,
backgroundColor: "#FFFFFF",
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
paddingHorizontal: 20
},
logout: { color: "#2563EB", fontWeight: "700" },
feed: { padding: 18, paddingBottom: 30 },
title: { fontSize: 28, fontWeight: "900", color: "#14213D" },
composer: {
backgroundColor: "#FFFFFF",
borderRadius: 16,
padding: 15,
marginVertical: 20
},
sectionTitle: {
fontSize: 18,
fontWeight: "800",
color: "#14213D",
marginBottom: 12
},
postInput: {
backgroundColor: "#F3F5F9",
borderRadius: 12,
padding: 14,
minHeight: 85,
textAlignVertical: "top"
},
postCard: {
backgroundColor: "#FFFFFF",
padding: 16,
borderRadius: 15,
marginBottom: 12
},
postAuthor: {
fontWeight: "800",
color: "#14213D",
marginBottom: 10
},
postContent: { color: "#374151", fontSize: 15, lineHeight: 23 },
postDate: { color: "#929AAA", fontSize: 11, marginTop: 12 },
muted: { color: "#929AAA", textAlign: "center", marginTop: 15 },
bottom: {
height: 62,
backgroundColor: "#FFFFFF",
flexDirection: "row",
justifyContent: "space-around",
alignItems: "center"
},
navItem: { padding: 5 },
navText: { fontSize: 11, color: "#929AAA" },
selected: { color: "#2563EB", fontWeight: "900" }
});


