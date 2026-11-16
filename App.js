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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";

import { supabase } from "./lib/supabase";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");

  const [isSignup, setIsSignup] = useState(false);
  const [active, setActive] = useState("Accueil");

  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");

  // INITIALISATION ET AUTHENTIFICATION

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        Alert.alert("DN Social", error.message);
      }

      setSession(data?.session || null);
      setLoading(false);
    }

    initialize();

    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
      });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // CRÉATION AUTOMATIQUE DU PROFIL APRÈS CONNEXION

  useEffect(() => {
    if (!session?.user) {
      setPosts([]);
      return;
    }

    async function createProfileIfNeeded() {
      const user = session.user;
      const metadata = user.user_metadata || {};

      const savedUsername = metadata.username;
      const savedFullName = metadata.full_name;

      if (!savedUsername) return;

      const { error } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          username: savedUsername,
          full_name: savedFullName || ""
        },
        { onConflict: "id" }
      );

      if (error) {
        console.log("Profil :", error.message);
      }
    }

    createProfileIfNeeded();
    loadPosts();
  }, [session]);

  // INSCRIPTION ET CONNEXION

  async function authenticate() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("DN Social", "Remplis ton email et ton mot de passe.");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Mot de passe",
        "Le mot de passe doit contenir au moins 6 caractères."
      );
      return;
    }

    if (isSignup) {
      if (!username.trim() || !fullName.trim()) {
        Alert.alert(
          "Inscription",
          "Remplis ton nom complet et ton nom d'utilisateur."
        );
        return;
      }

      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
        Alert.alert(
          "Nom d'utilisateur",
          "Utilise 3 à 20 caractères : lettres, chiffres ou underscore."
        );
        return;
      }
    }

    setBusy(true);

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              username: username.trim().toLowerCase(),
              full_name: fullName.trim()
            }
          }
        });

        if (error) throw error;

        if (data.session) {
          Alert.alert(
            "Bienvenue sur DN Social",
            "Ton compte a été créé avec succès !"
          );
        } else {
          Alert.alert(
            "Vérifie ton email",
            "Ton inscription est enregistrée. Confirme ton adresse email avant de te connecter."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password
        });

        if (error) throw error;
      }
    } catch (error) {
      Alert.alert("Erreur", error.message || "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  // CHARGEMENT DES PUBLICATIONS

  async function loadPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id")
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Fil d'actualité", error.message);
      return;
    }

    setPosts(data || []);
  }

  // PUBLIER UN MESSAGE

  async function publishPost() {
    if (!newPost.trim()) {
      Alert.alert("Publication", "Écris quelque chose avant de publier.");
      return;
    }

    if (!session?.user) return;

    setBusy(true);

    try {
      const { error } = await supabase.from("posts").insert({
        user_id: session.user.id,
        content: newPost.trim(),
        media_type: "text"
      });

      if (error) throw error;

      setNewPost("");

      await loadPosts();

      Alert.alert("DN Social", "Publication partagée !");
    } catch (error) {
      Alert.alert("Publication impossible", error.message);
    } finally {
      setBusy(false);
    }
  }

  // DÉCONNEXION

  async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert("Déconnexion", error.message);
    }
  }

  // ÉCRAN DE CHARGEMENT

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.logo}>
          DN<Text style={styles.dot}>.</Text>
        </Text>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.muted}>Préparation de DN Social...</Text>
      </View>
    );
  }

  // ÉCRAN DE CONNEXION ET INSCRIPTION

  if (!session) {
    return (
      <KeyboardAvoidingView
        style={styles.authScreen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <StatusBar barStyle="dark-content" />

        <ScrollView
          contentContainerStyle={styles.authContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.logo}>
            DN<Text style={styles.dot}>.</Text>
          </Text>

          <Text style={styles.tagline}>
            Ton monde. Tes connexions.
          </Text>

          <View style={styles.authCard}>
            <Text style={styles.heading}>
              {isSignup ? "Rejoins DN Social" : "Bon retour !"}
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
              style={[
                styles.primaryButton,
                busy && styles.disabledButton
              ]}
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

            <TouchableOpacity
              onPress={() => setIsSignup(!isSignup)}
              style={styles.switchButton}
            >
              <Text style={styles.switchText}>
                {isSignup
                  ? "J'ai déjà un compte · Se connecter"
                  : "Nouveau sur DN ? · Créer un compte"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            DN SOCIAL · CRÉÉ AU SÉNÉGAL
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // APPLICATION PRINCIPALE

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* EN-TÊTE */}

      <View style={styles.header}>
        <Text style={styles.logoSmall}>
          DN<Text style={styles.dot}>.</Text>
        </Text>

        <TouchableOpacity onPress={loadPosts}>
          <Text style={styles.headerAction}>Actualiser</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Quitter</Text>
        </TouchableOpacity>
      </View>

      {/* ACCUEIL */}

      {active === "Accueil" && (
        <ScrollView contentContainerStyle={styles.feed}>
          <Text style={styles.title}>Ton monde.</Text>

          <Text style={styles.taglineLeft}>
            Tes idées. Tes connexions.
          </Text>

          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>
              Bienvenue sur DN Social !
            </Text>

            <Text style={styles.welcomeText}>
              Partage tes idées et découvre les publications de la communauté.
            </Text>
          </View>

          <View style={styles.composer}>
            <Text style={styles.sectionTitle}>
              Créer une publication
            </Text>

            <TextInput
              style={styles.postInput}
              placeholder="Quoi de neuf aujourd'hui ?"
              value={newPost}
              onChangeText={setNewPost}
              multiline
              maxLength={2000}
            />

            <Text style={styles.characterCount}>
              {newPost.length}/2000
            </Text>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                busy && styles.disabledButton
              ]}
              onPress={publishPost}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryText}>
                  Partager la publication
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.feedHeading}>
            <Text style={styles.sectionTitle}>
              Fil d'actualité
            </Text>

            <Text style={styles.postCount}>
              {posts.length} publication(s)
            </Text>
          </View>

          {posts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.postTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>DN</Text>
                </View>

                <View style={styles.authorInfo}>
                  <Text style={styles.postAuthor}>
                    Membre DN
                  </Text>

                  <Text style={styles.postDate}>
                    {new Date(post.created_at).toLocaleString()}
                  </Text>
                </View>
              </View>

              <Text style={styles.postContent}>
                {post.content}
              </Text>

              <View style={styles.postActions}>
                <Text style={styles.actionLabel}>♡ J'aime</Text>
                <Text style={styles.actionLabel}>Commenter</Text>
                <Text style={styles.actionLabel}>Partager</Text>
              </View>
            </View>
          ))}

          {posts.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                Le fil est encore vide
              </Text>

              <Text style={styles.muted}>
                Sois le premier à partager quelque chose sur DN Social !
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* DÉCOUVRIR */}

      {active === "Découvrir" && (
        <View style={styles.simplePage}>
          <Text style={styles.pageTitle}>Découvrir</Text>

          <Text style={styles.muted}>
            Découvre bientôt les membres et les publications populaires.
          </Text>
        </View>
      )}

      {/* CRÉER */}

      {active === "Créer" && (
        <View style={styles.simplePage}>
          <Text style={styles.pageTitle}>Créer</Text>

          <Text style={styles.muted}>
            Partage tes idées avec la communauté DN Social.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setActive("Accueil")}
          >
            <Text style={styles.primaryText}>
              Créer une publication
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MESSAGES */}

      {active === "Messages" && (
        <View style={styles.simplePage}>
          <Text style={styles.pageTitle}>Messages</Text>

          <Text style={styles.muted}>
            La messagerie privée sera ajoutée dans une prochaine version.
          </Text>
        </View>
      )}

      {/* PROFIL */}

      {active === "Profil" && (
        <View style={styles.simplePage}>
          <View style={styles.bigAvatar}>
            <Text style={styles.bigAvatarText}>DN</Text>
          </View>

          <Text style={styles.pageTitle}>Mon profil</Text>

          <Text style={styles.profileEmail}>
            {session.user.email}
          </Text>

          <Text style={styles.muted}>
            Ton espace personnel DN Social.
          </Text>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={logout}
          >
            <Text style={styles.logoutButtonText}>
              Se déconnecter
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* NAVIGATION */}

      <View style={styles.bottom}>
        {["Accueil", "Découvrir", "Créer", "Messages", "Profil"].map(
          (tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActive(tab)}
              style={styles.navItem}
            >
              <Text
                style={[
                  styles.navText,
                  active === tab && styles.selected
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );
}

// STYLES

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FC"
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F8FC"
  },

  authScreen: {
    flex: 1,
    backgroundColor: "#F7F8FC"
  },

  authContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 22
  },

  authCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    marginTop: 30,
    elevation: 3
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

  dot: {
    color: "#2563EB"
  },

  tagline: {
    color: "#7B8496",
    textAlign: "center",
    marginTop: 5
  },

  taglineLeft: {
    color: "#7B8496",
    marginTop: 5,
    marginBottom: 15
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

  disabledButton: {
    opacity: 0.6
  },

  primaryText: {
    color: "#FFFFFF",
    fontWeight: "800"
  },

  switchButton: {
    paddingVertical: 12
  },

  switchText: {
    textAlign: "center",
    color: "#2563EB",
    marginTop: 10,
    fontWeight: "600"
  },

  header: {
    height: 62,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16
  },

  headerAction: {
    color: "#2563EB",
    fontWeight: "700"
  },

  logout: {
    color: "#DC2626",
    fontWeight: "700"
  },

  feed: {
    padding: 18,
    paddingBottom: 30
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#14213D"
  },

  welcomeCard: {
    backgroundColor: "#EAF1FF",
    padding: 16,
    borderRadius: 16,
    marginVertical: 12
  },

  welcomeTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#14213D",
    marginBottom: 5
  },

  welcomeText: {
    color: "#53627A",
    lineHeight: 21
  },

  composer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    marginVertical: 12,
    elevation: 2
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

  characterCount: {
    color: "#929AAA",
    textAlign: "right",
    fontSize: 11,
    marginTop: 5
  },

  feedHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10
  },

  postCount: {
    color: "#929AAA",
    fontSize: 12
  },

  postCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 15,
    marginBottom: 12,
    elevation: 2
  },

  postTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EAF1FF",
    alignItems: "center",
    justifyContent: "center"
  },

  avatarText: {
    color: "#2563EB",
    fontWeight: "900"
  },

  authorInfo: {
    marginLeft: 10
  },

  postAuthor: {
    fontWeight: "800",
    color: "#14213D"
  },

  postContent: {
    color: "#374151",
    fontSize: 15,
    lineHeight: 23
  },

  postDate: {
    color: "#929AAA",
    fontSize: 11,
    marginTop: 3
  },

  postActions: {
    borderTopWidth: 1,
    borderTopColor: "#EEF0F4",
    marginTop: 15,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between"
  },

  actionLabel: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 12
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    padding: 22,
    borderRadius: 15,
    alignItems: "center"
  },

  emptyTitle: {
    color: "#14213D",
    fontWeight: "800",
    marginBottom: 8
  },

  muted: {
    color: "#929AAA",
    textAlign: "center",
    marginTop: 15,
    lineHeight: 21
  },

  simplePage: {
    flex: 1,
    padding: 22,
    justifyContent: "center",
    alignItems: "center"
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#14213D",
    marginBottom: 12
  },

  profileEmail: {
    color: "#2563EB",
    fontWeight: "700",
    marginTop: 15
  },

  bigAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#EAF1FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20
  },

  bigAvatarText: {
    fontSize: 30,
    fontWeight: "900",
    color: "#2563EB"
  },

  logoutButton: {
    backgroundColor: "#FEE2E2",
    padding: 14,
    borderRadius: 12,
    marginTop: 25
  },

  logoutButtonText: {
    color: "#DC2626",
    fontWeight: "800"
  },

  bottom: {
    height: 65,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEF0F4"
  },

  navItem: {
    padding: 5
  },

  navText: {
    fontSize: 11,
    color: "#929AAA"
  },

  selected: {
    color: "#2563EB",
    fontWeight: "900"
  },

  footer: {
    textAlign: "center",
    color: "#929AAA",
    fontSize: 10,
    marginTop: 30,
    letterSpacing: 1
  }
});
