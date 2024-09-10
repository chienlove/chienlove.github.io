CMS.registerWidget('update-size', createClass({
  getInitialState() {
    return { loading: false };
  },

  handleClick() {
    let plistUrl;
    const entry = this.props.entry;
    const fieldsMetaData = this.props.fieldsMetaData;

    // Thử lấy URL plist từ nhiều nguồn khác nhau
    if (entry.getIn(['data', 'main_download', 'plistUrl'])) {
      plistUrl = entry.getIn(['data', 'main_download', 'plistUrl']);
    } else if (fieldsMetaData && fieldsMetaData.getIn(['main_download', 'data', 'plistUrl'])) {
      plistUrl = fieldsMetaData.getIn(['main_download', 'data', 'plistUrl']);
    } else {
      // Nếu không tìm thấy URL, yêu cầu người dùng nhập
      plistUrl = prompt("Vui lòng nhập URL plist:");
      
      // Nếu URL được nhập, lưu nó vào trường plistUrl
      if (plistUrl) {
        this.props.onChange({ plistUrl }); // Lưu URL plist vào entry
      } else {
        alert('Không thể lấy URL plist. Vui lòng đảm bảo bạn đã nhập URL trong phần "Liên kết tải xuống chính".');
        return;
      }
    }

    this.setState({ loading: true });

    fetch(`/.netlify/functions/getIpaSize?url=${encodeURIComponent(plistUrl)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.size) {
          this.props.onChange({ size: data.size }); // Cập nhật kích thước file
          alert('Kích thước đã được cập nhật: ' + data.size);
        } else {
          throw new Error('Không nhận được dữ liệu kích thước từ API.');
        }
      })
      .catch(error => {
        console.error('Error in API call:', error);
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