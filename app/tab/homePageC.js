import * as React from 'react';
import { fetchUserId } from '../../components/userService';
import CommentOverlay from '../../components/commentOverlay';
import { StyleSheet, View, Text, TextInput, Modal, Share, TouchableOpacity, ScrollView, SafeAreaView, Button, RefreshControl, Image } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useIsFocused } from '@react-navigation/native';
import { useState, useEffect, useRef } from 'react';

import { db, auth, storage, firebase } from '../../firebase_config';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, listAll, getDownloadURL } from 'firebase/storage';

import SideBar from '../../components/SideNav';

export default function NewsfeedCol({ navigation }) {
    const isFocused = useIsFocused();
    const [refreshing, setRefreshing] = React.useState(false);
    const [openSideBar, setOpenSideBar] = React.useState();
    const [users, setUsers] = useState([]);
    const [userUploads, setUserUploads] = useState([]);
    const [imageCol, setImageCol] = useState([]);
    const [isModalVisible, setModalVisible] = useState(false);
    const [postText, setPostText] = useState('');
    const [postTitle, setPostTitle] = useState('');
    const [likedPosts, setLikedPosts] = useState([]);
    const [commentText, setCommentText] = useState('');
    
    const currentDate = getCurrentDate();

    let uploadCollection = [];

    const usersCollection = collection(db, "users");
    const reportRef = firebase.firestore().collection("generalUsersReports");
    const imageColRef = ref(storage, "postImages/");
    
    const toggleModal = () => {
        setModalVisible(!isModalVisible);
    };
    
    const handleSharePress = async (postId, description, imageURL) => {
        try {
          const result = await Share.share({
            title: 'Check out this post!',
            message: `${description}\n\nImage: ${imageURL}`, // Include any additional details you want to share
          });
      
          if (result.action === Share.sharedAction) {
            console.log('Post shared successfully');
          } else if (result.action === Share.dismissedAction) {
            console.log('Sharing dismissed');
          }
        } catch (error) {
          console.error('Error sharing post:', error.message);
        }
      };
      
    const handleLike = async (postId) => {
        try {
          // Check if the post is already liked
          const isAlreadyLiked = likedPosts.includes(postId);
    
          // Toggle the liked status
          const newLikedPosts = isAlreadyLiked
            ? likedPosts.filter((id) => id !== postId)
            : [...likedPosts, postId];
    
          // Update the state
          setLikedPosts(newLikedPosts);
    
          const userId = await fetchUserId();

          // Update the liked status in the database
          await updateLikesInDatabase(postId, userId, !isAlreadyLiked);
        } catch (error) {
          console.error('Error liking/unliking post: ', error);
        }
      };

    const updateLikesInDatabase = async (postId, userId, isLiked) => {
        try {
            const likesRef = collection(db, 'likes');
            const likedPostQuery = query(likesRef, where('postId', '==', postId), where('userId', '==', userId));
            const likedPostSnapshot = await getDocs(likedPostQuery);
    
            if (!likedPostSnapshot.empty) {
                likedPostSnapshot.forEach(async (doc) => {
                    await deleteDoc(doc.ref);
                });
            } else {
                await addDoc(collection(db, 'likes'), {
                    postId,
                    userId,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                });
            }
        } catch (error) {
            console.error('Error updating likes in the database: ', error);
        }   
    };
    
    const handlePost = async () => {
        // Check if both postTitle and postText are not empty
        if (postTitle.trim() === '' || postText.trim() === '') {
            alert('Please enter a post title and content.');
            return;
        }

        try {
            // Fetch the user ID
            const userId = await fetchUserId();

            if (!userId) {
                alert('Error fetching user ID.');
                return;
            }

            const postRef = await addDoc(collection(db, 'posts'), {
                postTitle,
                postContent: postText,
                userId, // Use the fetched user ID
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });
            
            // Store userId in 'users' collection
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { userId:userId }); 
            
            setPostTitle('');
            setPostText('');
            setModalVisible(false);
        } catch (error) {
            console.error('Error adding post: ', error);
        }
    };
     
    function getCurrentDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const currentDate = new Date().toLocaleDateString(undefined, options);
      
        return currentDate;
    }

    useEffect(() => {
        if(!isFocused) {
            setOpenSideBar();
        }
    });

    useEffect(() => {    
        // Fetch liked posts from Firebase
        const fetchLikedPosts = async () => {
          try {
            const user = auth.currentUser;
            if (user) {
              const likedPostsRef = collection(db, 'likes');
              const userLikedPostsQuery = query(likedPostsRef, where('userId', '==', user.uid));
              const userLikedPostsSnapshot = await getDocs(userLikedPostsQuery);
              const likedPostsIds = userLikedPostsSnapshot.docs.map(doc => doc.data().postId);
              setLikedPosts(likedPostsIds);
            }
          } catch (error) {
            console.error('Error fetching liked posts: ', error);
          }
        };
    
        // Fetch liked posts when the component mounts
        fetchLikedPosts();
      }, []); 

    useEffect(() => {
        const getUsers = async () => {
            try {
              const data = await getDocs(usersCollection);
              const fetchedUsers = data.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
              setUsers(fetchedUsers);
            } catch (error) {
              console.error('Error fetching users: ', error);
            }
          };
          getUsers()

        reportRef.onSnapshot(
            querySnapshot => {
                const uploads = []
                querySnapshot.forEach((doc) => {
                    const {associatedImage, dateTime, description, location, status, userId} = doc.data();
                    uploads.push({
                        id: doc.id,
                        associatedImage,
                        dateTime,
                        description,
                        location,
                        status,
                        userId
                    })
                })
                setUserUploads(uploads)
                
                listAll(imageColRef).then((response) => {
                    setImageCol([]);
                    response.items.forEach((item) => {
                        getDownloadURL(item).then((url) => {
                            setImageCol((prev) => [...prev, url])
                        })
                    })
                })
            }
        )
    }, [])
    
    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
        }, 1000);
    }, []);
    

    function SideNavigation(navigation) {
        return (
            <>
                <View style={{position: 'absolute', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'flex-start', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 99}}>
                    <TouchableOpacity style={{ position: 'absolute', left: 20, top: 30, zIndex: 150 }} onPress={() => {setOpenSideBar()}}>
                        <Ionicons name='arrow-back' style={{ fontSize: 40, color: 'rgb(81,175,91)' }} />
                    </TouchableOpacity>
                    {SideBar(navigation)}
                    <TouchableOpacity style={{position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0)', zIndex: -1}} onPress={() => {setOpenSideBar()}} />
                </View>
            </>
        );
    }

    function BodyContent() {
        const [isCommentOverlayVisible, setIsCommentOverlayVisible] = useState({});
        const [postComments, setPostComments] = useState({});
        const [currentPostId, setCurrentPostId] = useState(null);

        const handleToggleCommentOverlay = async (postId) => {
            setCurrentPostId(postId);
            setIsCommentOverlayVisible((prevState) => ({
            ...prevState,
            [postId]: !prevState[postId],
            }));

            try {
            const commentsRef = collection(db, 'comments');
            const postCommentsQuery = query(commentsRef, where('postId', '==', postId));
            const postCommentsSnapshot = await getDocs(postCommentsQuery);
            const commentsData = postCommentsSnapshot.docs.map((doc) => doc.data().content);
            setPostComments((prevComments) => ({ ...prevComments, [postId]: commentsData }));
            } catch (error) {
            console.error('Error fetching comments: ', error);
            }
        };

        const handlePostComment = async (postId, commentText) => {
            try {
                if (!commentText || commentText.trim() === '') {
                    console.log('Comment cannot be empty.');
                    return;
                }
        
                const user = auth.currentUser;
        
                if (!user) {
                    console.error('User not authenticated.');
                    return;
                }
        
                // Fetch the user ID
                const currentUserId = await fetchUserId();
        
                if (!currentUserId) {
                    console.error('Error fetching user ID.');
                    return;
                }
        
                // Get the current username
                const currentUser = users.find((u) => u.id === currentUserId);
        
                if (!currentUser) {
                    console.error('Current user not found:', currentUserId);
                    console.log('All users:', users);
                    return;
                }
        
                const currentUsername = currentUser?.username || 'Unknown User';
        
                // Prepare the comment data
                const commentData = {
                    postId: postId,
                    userId: currentUserId,
                    username: currentUsername,
                    content: commentText,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                };
        
                // Add the comment to the 'comments' collection
                await addDoc(collection(db, 'comments'), commentData);
        
                // Fetch the updated comments for the current post
                const commentsRef = collection(db, 'comments');
                const postCommentsQuery = query(commentsRef, where('postId', '==', postId));
                const postCommentsSnapshot = await getDocs(postCommentsQuery);
                const commentsData = postCommentsSnapshot.docs.map((doc) => doc.data().content);
        
                // Update the local state to display the updated comments
                setPostComments((prevComments) => ({
                    ...prevComments,
                    [postId]: commentsData,
                }));
        
                // Clear the commentText state
                setCommentText('');
            } catch (error) {
                console.error('Error posting comment: ', error);
            }
        };

        let temp = [];
    
        userUploads.map((uploads) => {
            var valueToPush = {};
            valueToPush["id"] = uploads.id;
            valueToPush["imageLink"] = uploads.associatedImage;
            valueToPush["dateTime"] = uploads.dateTime;
            valueToPush["description"] = uploads.description;
            valueToPush["location"] = uploads.location;
            valueToPush["status"] = uploads.status;
            valueToPush["userId"] = uploads.userId;
            uploadCollection.push(valueToPush);
            uploadCollection.sort((a, b) => {
                let fa = a.dateTime,
                    fb = b.dateTime;
                if (fa < fb) {
                    return -1;
                }
                if (fa > fb) {
                    return 1;
                }
                return 0;
            });
        });
    
        uploadCollection.map((post, index) => {
            let imageURL;
            imageCol.map((url) => {
                if (url.includes(post.imageLink)) {
                    imageURL = url;
                }
            });
    
            temp.push(
                <View style={[styles.contentButton, styles.contentGap]} key={post.id}>
                  <TouchableOpacity activeOpacity={0.5}>
                    <View style={styles.contentButtonFront}>
                      <View style={{ width: '93%', flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 15 }}>
                        <View style={styles.containerPfp}>
                          <Ionicons name='person-outline' style={styles.placeholderPfp} />
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'rgba(113, 112, 108, 1)' }}>
                            {users.map((user) => {
                                if (post.userId === user.id) {
                                return `${user.firstName} ${user.lastName}`;
                                }
                                return null; // or handle the case when user is not found
                            })}
                            </Text>
                      </View>
                      <SafeAreaView style={{ width: '100%', marginVertical: 10, paddingHorizontal: 22, paddingBottom: 5, borderBottomWidth: 1, borderColor: 'rgba(190, 190, 190, 1)' }}>
                        <Text style={{ fontSize: 13, marginBottom: 5, }}>{post.description}</Text>
                        <View style={{ width: '100%', height: 250, backgroundColor: '#D6D6D8', marginVertical: 5, justifyContent: 'center', alignItems: 'center' }}>
                          <Image source={{ uri: imageURL }} style={{ width: '100%', height: '100%', flex: 1, resizeMode: 'cover' }} />
                        </View>
                      </SafeAreaView>
                      <View style={{ width: '90%', flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                        <TouchableOpacity activeOpacity={0.5} onPress={() => handleLike(post.id)}>
                          <Ionicons
                            name={likedPosts.includes(post.id) ? 'heart' : 'heart-outline'}
                            style={{ fontSize: 25, color: likedPosts.includes(post.id) ? 'red' : 'black' }}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.5} onPress={() => handleToggleCommentOverlay(post.id)}>
                          <Ionicons name='chatbubble-outline' style={{ fontSize: 25 }} />
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.5}>
                        <Ionicons
                            name="share-outline"
                            style={{ fontSize: 25 }}
                            onPress={() => handleSharePress(post.id, post.description, imageURL)}
                            />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
          
                  {/* Comment overlay */}
                {isCommentOverlayVisible[post.id] && (
                    <CommentOverlay
                    comments={postComments[post.id] || []}
                    commentText={commentText}
                    setCommentText={setCommentText}
                    handlePostComment={() => handlePostComment(post.id, commentText)}
                    />
                  )}
                </View>
              );
            });
          
            return (
                <View>
                    {temp}
                </View>
        );      
    }
    
    

    function ViewAllContent() {
        let temp1 = [];
        imageCol.map((url) => {
            temp1.push(
                <TouchableOpacity activeOpacity={0.5}>
                    <View style={{ width: 80, height: 80, backgroundColor: '#D6D6D8', marginVertical: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 10 }}>
                        {/* <Ionicons name='images-outline' style={{fontSize: 40, color: 'white'}} /> */}
                        <Image src={url} style={{width: '100%', height: '100%', flex: 1, resizeMode: 'cover'}} />
                    </View>
                </TouchableOpacity>
            );
        });
        
        <ul>
            {temp1.map(item =>
                <li key="{item}">{item}</li>
            )}
        </ul>

        return (
            <View style={{flexDirection: 'row', marginHorizontal: 10, gap: 10}}>
                {temp1}
            </View>
        );
    }

    return (
        <>
            <TouchableOpacity style={{ position: 'absolute', left: 20, top: 30, zIndex: 99 }} onPress={() => { setOpenSideBar(SideNavigation(navigation)) }}>
                <Ionicons name='menu' style={{ fontSize: 40, color: 'rgb(81,175,91)' }} />
            </TouchableOpacity>
    
            {openSideBar}
    
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
                <SafeAreaView style={styles.container}>
                    <View style={{ width: '100%', flexDirection: 'row', top: 11, justifyContent: 'center', paddingTop: 14 }}>
                        <Text style={{ fontSize: 25, fontWeight: 900, color: 'rgb(81,175,91)' }}>DASHBOARD</Text>
                    </View>
                    <Text style={{ position: 'absolute', right: 20, top: 90 }}>
                        <Text style={{ fontWeight: 600 }}> {currentDate}</Text>
                    </Text>
                    <View style={{ width: 330, backgroundColor: 'rgb(231, 247, 233)', borderRadius: 10, overflow: 'hidden', marginBottom: 5, marginTop: 50 }}>
                        <View style={{ flexDirection: 'row', width: '100%' }}>
                            <Text style={{ left: 10, marginTop: 15, fontWeight: 700 }}>REPORTS TODAY</Text>
                            <TouchableOpacity activeOpacity={0.5} style={{ position: 'absolute', right: 15, marginTop: 15 }}>
                                <Text style={{ textDecorationLine: 'underline' }}>
                                    View all
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView horizontal={true}>
                            {ViewAllContent()}
                        </ScrollView>
                    </View>
                    <View>
                        <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-start' }}>
                            <Text style={{ fontSize: 20, fontWeight: 900, color: 'rgb(81,175,91)' }}>NEWSFEED</Text>
                        </View>
                        <View style={{ width: 330, backgroundColor: 'rgb(230, 230, 230)', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgb(16, 139, 0)', marginBottom: 20 }}>
                            <TouchableOpacity activeOpacity={0.5} onPress={toggleModal}>
                                <View style={{ backgroundColor: '#ffffff', flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 15, alignItems: 'center' }}>
                                    <View style={[styles.containerPfp, { width: 40, height: 40 }]}>
                                        <Ionicons name='person-outline' style={[styles.placeholderPfp, { fontSize: 25 }]} />
                                    </View>
                                    <View>
                                        <Text style={{ left: 15 }}>
                                            What's on your mind?
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>
                        <View style={{ paddingHorizontal: 10, flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                            <View style={{ width: 70, height: 35, backgroundColor: 'rgb(179, 229, 94)', borderRadius: 20, overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: 3, }, shadowOpacity: 0.27, elevation: 3 }}>
                                <TouchableOpacity activeOpacity={0.5}>
                                    <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgb(247, 245, 243)' }}>
                                        <Text style={{ fontWeight: 700, fontSize: 15, color: 'rgb(113, 112, 108)' }}>All</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <View style={{ width: 90, height: 35, backgroundColor: 'rgb(179, 229, 94)', borderRadius: 20, overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: 3, }, shadowOpacity: 0.27, elevation: 3 }}>
                                <TouchableOpacity activeOpacity={0.5}>
                                    <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgb(247, 245, 243)' }}>
                                        <Text style={{ fontWeight: 700, fontSize: 15, color: 'rgb(113, 112, 108)' }}>Reports</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <View style={{ width: 90, height: 35, backgroundColor: 'rgb(179, 229, 94)', borderRadius: 20, overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: 3, }, shadowOpacity: 0.27, elevation: 3 }}>
                                <TouchableOpacity activeOpacity={0.5}>
                                    <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgb(247, 245, 243)' }}>
                                        <Text style={{ fontWeight: 700, fontSize: 15, color: 'rgb(113, 112, 108)' }}>Events</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                        {BodyContent()}
                    </View>
                </SafeAreaView>
            </ScrollView>
    
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => {
                    setModalVisible(!isModalVisible);
                }}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <TextInput
                            placeholder="Post Title"
                            value={postTitle}
                            onChangeText={(text) => setPostTitle(text)}
                            style={styles.modalTitleInput} 
                        />
                        <TextInput
                            placeholder="Write your post content here..."
                            multiline
                            value={postText}
                            onChangeText={(text) => setPostText(text)}
                            style={styles.modalTextInput}
                        />
                        <TouchableOpacity style={styles.modalButton} onPress={handlePost}>
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>POST</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalCloseButton} onPress={toggleModal}>
                            <Text style={{ color: 'black' }}>CLOSE</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingBottom: 60,
        paddingTop: 20,
    },
    contentGap: {
        marginBottom: 10,
    },
    contentButton: {
        width: 330,
        backgroundColor: 'rgb(230, 230, 230)',
        borderRadius: 5,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: {
            width: 3,
            height: 3,
        },
        shadowOpacity: 1,
        shadowRadius: 1,
        elevation: 5,
    },
    contentButtonFront: {
        width: '100%',
        backgroundColor: 'rgb(247, 245, 243)',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'rgba(113, 112, 108, 1)',
    },
    containerPfp: {
        width: 35,
        height: 35,
        backgroundColor: '#D6D6D8',
        borderRadius: 55,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderPfp: {
        fontSize: 25,
        color: 'rgba(113, 112, 108, 1)',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalTitleInput: {
        height: 40, // Adjust the height as needed
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 5,
        marginVertical: 10,
        padding: 10,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        width: '80%',
    },
    modalTextInput: {
        height: 100,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 5,
        marginVertical: 10,
        padding: 10,
    },
    modalButton: {
        backgroundColor: 'green',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
    modalCloseButton: {
        backgroundColor: 'lightgray',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 10,
    },
});