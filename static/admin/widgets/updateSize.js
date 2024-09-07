import React from 'react';
import { TextControl } from '@wordpress/components';

const UpdateSizeControl = ({ onChange, value }) => {
  const [isUpdating, setIsUpdating] = React.useState(false);

  const updateSize = async () => {
    setIsUpdating(true);
    const plistUrl = document.querySelector('input[name="main_download.plistUrl"]').value;
    
    if (!plistUrl) {
      alert('Vui lòng nhập URL Plist trước khi cập nhật kích thước.');
      setIsUpdating(false);
      return;
    }

    try {
      const response = await fetch(`/.netlify/functions/getIpaSize?url=${encodeURIComponent(plistUrl)}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      onChange(data.size);
    } catch (error) {
      console.error('Error updating size:', error);
      alert(`Lỗi khi cập nhật kích thước: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div>
      <TextControl
        label="Kích thước"
        value={value || ''}
        onChange={onChange}
      />
      <button onClick={updateSize} disabled={isUpdating}>
        {isUpdating ? 'Đang cập nhật...' : 'Cập nhật kích thước'}
      </button>
    </div>
  );
};

export default UpdateSizeControl;