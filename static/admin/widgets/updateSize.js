CMS.registerWidget('update-size', createClass({
  getInitialState() {
    return { loading: false };
  },

  handleClick() {
    let plistUrl;
    const entry = this.props.entry;
    const fieldsMetaData = this.props.fieldsMetaData;

    plistUrl = entry.getIn(['data', 'main_download', 'plistUrl']) || 
               fieldsMetaData?.getIn(['main_download', 'data', 'plistUrl']) || 
               prompt("Vui lòng nhập URL plist:");

    if (!plistUrl) {
      alert('Không thể lấy URL plist. Vui lòng đảm bảo bạn đã nhập URL.');
      return;
    }

    this.setState({ loading: true });

    fetch('/.netlify/functions/getIpaSize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plistUrl })
    })
    .then(response => response.ok ? response.json() : response.text().then(text => { throw new Error(text); }))
    .then(data => {
      if (data.size) {
        this.props.onChange(data.size);
        alert(`Kích thước đã được cập nhật: ${data.size}`);
      } else {
        throw new Error('Không nhận được dữ liệu kích thước từ API.');
      }
    })
    .catch(error => {
      alert(`Có lỗi xảy ra: ${error.message}`);
    })
    .finally(() => this.setState({ loading: false }));
  },

  render() {
    const { value, forID, classNameWrapper, setActiveStyle, setInactiveStyle } = this.props;
    const { loading } = this.state;

    return h('div', { className: `${classNameWrapper} size-update-widget`, style: { display: 'flex', alignItems: 'center' } },
      h('input', {
        type: 'text', id: forID, className: classNameWrapper,
        value: value || '', onChange: e => this.props.onChange(e.target.value),
        disabled: loading, style: { marginRight: '10px', width: '150px', padding: '5px' }
      }),
      h('button', {
        type: 'button', onClick: this.handleClick,
        disabled: loading, style: { padding: '5px 10px' }
      }, loading ? 'Đang cập nhật...' : 'Cập nhật kích thước')
    );
  }
}));

CMS.init();