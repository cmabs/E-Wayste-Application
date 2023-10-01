import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Button, RefreshControl, Image } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';

import { Camera, CameraType, FlashMode } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { useIsFocused } from '@react-navigation/native';

export default function CameraOpen({ navigation: {goBack} }) {
    const [hasCameraPermission, setHasCameraPermission] = useState(null);
    const [hasGalleryPermission, setHasGalleryPermission] = useState(null);

    const [image, setImage] = useState(null);
    const [type, setType] = useState(CameraType.back);
    const [flash, setFlash] = useState(Camera.Constants.FlashMode.off);
    const cameraRef = useRef(null);

    useEffect(() => {
        (async () => {
            MediaLibrary.requestPermissionsAsync();
            const cameraStatus = await Camera.requestCameraPermissionsAsync();
            setHasCameraPermission(cameraStatus.status === 'granted');

            const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
            setHasGalleryPermission(galleryStatus.status == 'granted');
        })();
    }, [])

    const takePicture = async () => {
        if(cameraRef) {
            try {
                const data = await cameraRef.current.takePictureAsync();
                console.log(data);
                setImage(data.uri);
            } catch(e) {
                console.log(e);
            }
        }
    }

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                //allowsEditing: true,
                //aspect: [4,3],
                quality: 1
            });
            console.log(result.assets[0]);
            setImage(result.assets[0].uri);
        } catch(e) {}
    }

    if(hasCameraPermission === false) {
        return <Text>No access to camera</Text>
    }
    if(hasGalleryPermission === false) {
        return <Text>No access to gallery</Text>
    }

    const isFocused = useIsFocused();
        
    if(isFocused) {
        return (
            <>
                <View style={styles.container}>
                    {!image ?
                        <Camera 
                            style={{height: '70%', borderRadius: 20}}
                            type={type}
                            flashMode={flash}
                            ref={cameraRef}
                        />
                        :
                        <View style={{height: '100%', width: '100%', backgroundColor: 'white'}}>
                            <View style={{flex: 1, marginTop: 20, alignItems: 'center'}}>
                                <ScrollView style={{flex: 1, width: '100%'}}>
                                    <View style={{width: '100%', alignItems: 'center', paddingVertical: 10}}>
                                        <Text>GARBAGE REPORT</Text>
                                        <View style={{height: 500, width: '95%', padding: 5, backgroundColor: 'rgb(245, 245, 245)', borderRadius: 5, borderWidth: 1, borderColor: 'rgb(235, 235, 235)'}}>
                                            <Image source={{uri: image}} style={{flex: 1, resizeMode: 'contain'}} />
                                        </View>
                                        <TextInput
                                            style={{
                                                height: 40,
                                                width: '95%',
                                                backgroundColor: 'rgb(189,227,124)',
                                                borderRadius: 5,
                                                borderWidth: 0.5,
                                                borderColor: "rgb(215,233,217)",
                                                color: "rgba(45, 105, 35, 1)",
                                                paddingLeft: 15,
                                                marginVertical: 10
                                            }}
                                            placeholder='Add Location'
                                        />
                                        <TextInput
                                            style={{
                                                height: 150,
                                                width: '95%',
                                                backgroundColor: 'rgb(189,227,124)',
                                                borderRadius: 5,
                                                borderWidth: 0.5,
                                                borderColor: "rgb(215,233,217)",
                                                color: "rgba(45, 105, 35, 1)",
                                                padding: 15,
                                                paddingRight: 8,
                                                textAlignVertical: 'top',
                                            }}
                                            placeholder='Add Description'
                                            multiline={true}
                                        />
                                    </View>
                                </ScrollView>
                            </View>
                            <View style={{alignItems: 'center', paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 50, backgroundColor: 'rgba(242,190,45,0)', borderTopRightRadius: 10, borderTopLeftRadius: 10}}>
                                <View style={{height:45, width: 130, backgroundColor: 'black', borderRadius: 100, overflow: 'hidden'}}>
                                    <TouchableOpacity style={{width: '100%', height: '100%'}} activeOpacity={0.8} onPress={() => {setImage(null)}}>
                                        <View style={{width: '100%', height: '100%', backgroundColor: 'rgb(81,175,91)', justifyContent: 'center', alignItems: 'center'}}>
                                            <Text style={{fontWeight: 900, color: 'white'}}>RETAKE</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                                <View style={{height:45, width: 130, backgroundColor: 'black', borderRadius: 100, overflow: 'hidden'}}>
                                    <TouchableOpacity style={{width: '100%', height: '100%'}} activeOpacity={0.8} /*onPress={}*/>
                                        <View style={{width: '100%', height: '100%', backgroundColor: 'rgb(81,175,91)', justifyContent: 'center', alignItems: 'center'}}>
                                            <Text style={{fontWeight: 900, color: 'white'}}>POST</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                        /*<View style={{flex: 1, borderRadius: 20, marginTop: 20}}>
                            <Image source={{uri: image}} style={{flex: 1, resizeMode: 'contain'}} />
                        </View>*/
                    }
                    {image ?
                        <></>
                        :
                        <View style={{alignItems: 'center', paddingVertical: 5, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5, marginTop: 10}}>
                            <TouchableOpacity activeOpacity={0.9} onPress={() => {goBack();}}>
                                <View style={{backgroundColor: 'rgba(0,0,0,0)', justifyContent: 'center', alignItems: 'center', height: 60, width: 60, borderRadius: 1000}}>
                                    <Ionicons name='arrow-undo-outline' style={{color: 'white', fontSize: 28}} />
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity activeOpacity={0.9} onPress={() => {
                                setType(type === CameraType.back ? CameraType.front : CameraType.back)
                            }}>
                                <View style={{backgroundColor: 'rgba(0,0,0,0)', justifyContent: 'center', alignItems: 'center', height: 60, width: 60, borderRadius: 1000}}>
                                    <Ionicons name={type === CameraType.back ? 'camera-reverse-outline' : 'camera-reverse'} style={{color: 'white', fontSize: 28}} />
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity activeOpacity={0.9} onPress={takePicture}>
                                <View style={{backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', height: 60, width: 60, borderRadius: 1000, marginHorizontal: 20}}>
                                    <Ionicons name="camera" style={{color: 'rgb(81,175,91)', fontSize: 40}} />
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity activeOpacity={0.9} onPress={() => {
                                setFlash(flash === Camera.Constants.FlashMode.off ? Camera.Constants.FlashMode.on : Camera.Constants.FlashMode.off)
                            }}>
                                <View style={{backgroundColor: 'rgba(0,0,0,0)', justifyContent: 'center', alignItems: 'center', height: 60, width: 60, borderRadius: 1000}}>
                                    <Ionicons name={flash === Camera.Constants.FlashMode.off ? 'flash-outline' : 'flash'} style={{color: 'white', fontSize: 25}} />
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity activeOpacity={0.9} onPress={pickImage}>
                                <View style={{backgroundColor: 'rgba(0,0,0,0)', justifyContent: 'center', alignItems: 'center', height: 60, width: 60, borderRadius: 1000}}>
                                    <Ionicons name='image-outline' style={{color: 'white', fontSize: 28}} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    }
                </View>
            </>
        );
    } else if(!isFocused) {
        console.log("Camera is not Focused")
        return null;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'black',
    },
})