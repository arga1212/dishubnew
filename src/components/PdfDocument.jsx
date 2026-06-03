import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

import PoppinsRegular from '../assets/fonts/Poppins-Regular.ttf';
import PoppinsBold from '../assets/fonts/Poppins-Bold.ttf';
import PoppinsExtraBold from '../assets/fonts/Poppins-ExtraBold.ttf';

// Register Font
Font.register({
  family: 'Poppins',
  fonts: [
    {
      src: PoppinsRegular,
      fontWeight: 400,
    },
    {
      src: PoppinsBold,
      fontWeight: 700,
    },
    {
      src: PoppinsExtraBold,
      fontWeight: 800,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    width: '14cm',
    height: '17cm',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0.5cm',
    border: '1pt solid #000000',
  },

  photoContainer: {
    width: '13cm',
    height: '13.5cm',
    marginBottom: '0.4cm',
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },

  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  name: {
    fontFamily: 'Poppins',
    fontWeight: 800,
    fontSize: 28,
    textAlign: 'center',
    textTransform: 'uppercase',
    color: '#1e3a8a',
    letterSpacing: 1,
    width: '100%',
  },
});

export const PdfDocument = ({ name, photo }) => (
  <Document>
    <Page size="A5" style={styles.page}>
      <View style={styles.card}>
        <View style={styles.photoContainer}>
          {photo && <Image src={photo} style={styles.photo} />}
        </View>

        <Text style={styles.name}>
          {name || 'NAMA PETUGAS'}
        </Text>
      </View>
    </Page>
  </Document>
);