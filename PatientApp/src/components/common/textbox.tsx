import { useState } from "react";
import { Text, TextInput, TextInputProps, TouchableOpacity, View } from "react-native";
import { styles } from "./textbox.styles";
import Ionicons from "@expo/vector-icons/Ionicons";

interface TextboxProps extends TextInputProps {
  label: string;
  icon?: any;
  error?: string;
  secureToggle?: boolean;
}

export function Textbox({
  label,
  icon,
  error,
  onPress,
  secureToggle,
  secureTextEntry,
  ...props
}: Readonly<TextboxProps>) {
  const [hidden, setHidden] = useState(true);
  const isSecure = secureToggle ? hidden : secureTextEntry;

  const inner = (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, error ? styles.inputWrapperError : undefined]}>
        {icon ? <Ionicons name={icon} size={20} style={styles.icon} /> : null}
        <TextInput
          style={styles.input}
          placeholderTextColor="#8a8a8a"
          secureTextEntry={isSecure}
          {...props}
        />
        {secureToggle ? (
          <TouchableOpacity
            onPress={() => setHidden((h) => !h)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
          >
            <Ionicons
              name={hidden ? "eye-off-outline" : "eye-outline"}
              size={20}
              style={styles.eyeIcon}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }
  return <View style={styles.container}>{inner}</View>;
}
