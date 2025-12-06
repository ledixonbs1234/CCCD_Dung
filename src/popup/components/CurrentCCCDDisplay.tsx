import { Card, Descriptions, Tag, Badge } from "antd";
import { UserOutlined, IdcardOutlined, CalendarOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { CCCDInfo } from "../utils/cccdGenerator";

interface CurrentCCCDDisplayProps {
  currentCCCD: CCCDInfo | null;
  currentIndex: number;
}

export default function CurrentCCCDDisplay({ currentCCCD, currentIndex }: CurrentCCCDDisplayProps) {
  if (!currentCCCD) {
    return (
      <Card 
        title="👤 CCCD hiện tại" 
        size="small"
        style={{ marginBottom: '16px' }}
      >
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: '#999' 
        }}>
          Chưa có CCCD đang xử lý
        </div>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'processing': return 'blue';
      case 'completed': return 'green';
      case 'error': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Đang chờ';
      case 'processing': return 'Đang xử lý';
      case 'completed': return 'Hoàn thành';
      case 'error': return 'Lỗi';
      default: return status;
    }
  };

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>👤 CCCD hiện tại</span>
          <Badge 
            count={`#${currentIndex + 1}`} 
            style={{ backgroundColor: '#52c41a' }} 
          />
        </div>
      }
      size="small"
      style={{ marginBottom: '16px' }}
    >
      <Descriptions column={1} size="small">
        <Descriptions.Item 
          label={<span><UserOutlined /> Họ tên</span>}
        >
          <strong>{currentCCCD.Name}</strong>
        </Descriptions.Item>
        
        <Descriptions.Item 
          label={<span><IdcardOutlined /> CCCD</span>}
        >
          <code style={{ 
            background: '#f0f0f0', 
            padding: '2px 8px', 
            borderRadius: '4px',
            fontSize: '13px'
          }}>
            {currentCCCD.Id}
          </code>
        </Descriptions.Item>
        
        <Descriptions.Item 
          label={<span><CalendarOutlined /> Ngày sinh</span>}
        >
          {currentCCCD.NgaySinh}
        </Descriptions.Item>
        
        <Descriptions.Item 
          label={<span><EnvironmentOutlined /> Địa chỉ</span>}
        >
          {currentCCCD.DiaChi}
        </Descriptions.Item>
        
        <Descriptions.Item label="Giới tính">
          <Tag color={currentCCCD.gioiTinh === 'Nam' ? 'blue' : 'pink'}>
            {currentCCCD.gioiTinh}
          </Tag>
        </Descriptions.Item>
        
        <Descriptions.Item label="Trạng thái">
          <Tag color={getStatusColor(currentCCCD.status)}>
            {getStatusText(currentCCCD.status)}
          </Tag>
        </Descriptions.Item>
      </Descriptions>

      {currentCCCD.errorReason && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          background: '#fff2e8',
          border: '1px solid #ffbb96',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#d4380d'
        }}>
          <strong>Lỗi:</strong> {currentCCCD.errorReason}
        </div>
      )}

      {currentCCCD.processedAt && (
        <div style={{
          marginTop: '8px',
          fontSize: '11px',
          color: '#999',
          textAlign: 'right'
        }}>
          Xử lý lúc: {new Date(currentCCCD.processedAt).toLocaleString('vi-VN')}
        </div>
      )}
    </Card>
  );
}
