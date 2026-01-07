import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';
import type { ChatAttachment } from '@/components/chat';

export function useImagePicker() {
  const requestPermission = async (type: 'camera' | 'library') => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('許可が必要です', 'カメラを使用するには設定から許可してください。');
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('許可が必要です', '写真ライブラリにアクセスするには設定から許可してください。');
        return false;
      }
    }
    return true;
  };

  const pickImage = async (source: 'camera' | 'library'): Promise<ChatAttachment | null> => {
    const hasPermission = await requestPermission(source);
    if (!hasPermission) return null;

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    };

    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];

    // base64が直接取得できない場合（Webなど）はuriから取得を試みる
    let base64Data = asset.base64;
    if (!base64Data && asset.uri) {
      // Web環境ではuriがdata URLの場合がある
      if (asset.uri.startsWith('data:')) {
        const match = asset.uri.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          base64Data = match[2];
        }
      }
    }

    if (!base64Data) {
      Alert.alert('エラー', '画像の読み込みに失敗しました');
      return null;
    }

    // MIMEタイプを推定
    const mimeType = asset.mimeType || 'image/jpeg';

    return {
      kind: 'image',
      mimeType,
      dataBase64: base64Data,
      dataUrl: `data:${mimeType};base64,${base64Data}`,
      name: asset.fileName || `image-${Date.now()}.jpg`,
    };
  };

  const takePhoto = () => pickImage('camera');
  const pickFromLibrary = () => pickImage('library');

  return { takePhoto, pickFromLibrary };
}



