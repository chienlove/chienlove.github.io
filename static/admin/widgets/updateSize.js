CMS.registerWidget('update-size', createClass({
  getInitialState() {
    return { loading: false };
  },

  handleClick() {
    let plistUrl;
    const entry = this.props.entry;
    const fieldsMetaData = this.props.fieldsMetaData;

    // Lấy URL plist từ các nguồn khác nhau
    if (entry.getIn(['data', 'main_download', 'plistUrl'])) {
      plistUrl = entry.getIn(['data', 'main_download', 'plistUrl']);
    } else if (fieldsMetaData && fieldsMetaData.getIn(['main_download', 'data', 'plistUrl'])) {
      plistUrl = fieldsMetaData.getIn(['main_download', 'data', 'plistUrl']);
    } else {
      plistUrl = prompt("Vui lòng nhập URL plist:");
    }

    if (!plistUrl) {
      alert('Không thể lấy URL plist. Vui lòng đảm bảo bạn đã nhập URL trong phần "Liên kết tải xuống chính".');
      return;
    }

    this.setState({ loading: true });

    // Gọi API để tạo token cho URL plist
    fetch('/generate-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: plistUrl })
    })
    .then(response => response.text())  // Nhận token
    .then(token => {
      if (token) {
        console.log('Token:', token); // Log kiểm tra token

        // Tạo URL mới với token
        const urlWithToken = new URL(plistUrl);
        urlWithToken.searchParams.append('token', token);
        
        // Gọi API để lấy kích thước IPA với URL đã có token
        return fetch(`/.netlify/functions/getIpaSize?url=${encodeURIComponent(urlWithToken.toString())}`);
      } else {
        throw new Error('Không nhận được token.');
      }
    })
    .then(response => {
      if (!response.ok) {
        return response.text().then(text => {
          throw new Error(`HTTP error! status: ${response.status} - ${text}`);
        });
      }
      return response.json();
    })
    .then(data => {
      if (data.size) {
        this.props.onChange(data.size);
        alert('Kích thước đã được cập nhật: ' + data.size);
      } else {
        throw new Error('Không nhận được dữ liệu kích thước từ API.');
      }
    })
    .catch(error => {
      console.error('Lỗi khi gọi API:', error);
      alert('Có lỗi xảy ra khi cập nhật kích thước: ' + error.message);
    })
    .finally(() => {
      this.setState({ loading: false });
    });
  },

  render() {
    const { value, onChange, forID, classNameWrapper, setActiveStyle, setInactiveStyle } = this.props;
    const { loading } = this.state;

    return h(
      'div',
      {
        className: `${classNameWrapper} size-update-widget`,
        style: { display: 'flex', alignItems: 'center' }
      },
      h('input', {
        type: 'text',
        id: forID,
        className: classNameWrapper,
        value: value || '',
        onChange: e => onChange(e.target.value),
        onFocus: setActiveStyle,
        onBlur: setInactiveStyle,
        disabled: loading,
        style: { marginRight: '10px', width: '150px', padding: '5px' }
      }),
      h(
        'button',
        {
          className: `${classNameWrapper} btn`,
          type: 'button',
          onClick: this.handleClick,
          disabled: loading,
          style: { padding: '5px 10px' }
        },
        loading ? 'Đang cập nhật...' : 'Cập nhật kích thước'
      )
    );
  }
}));

CMS.init();