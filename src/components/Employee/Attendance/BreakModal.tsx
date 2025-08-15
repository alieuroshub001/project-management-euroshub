// components/employee/attendance/BreakModal.tsx
'use client';

import { Modal, Button, Typography, Select, Input, Form } from 'antd';
import { useState, useEffect } from 'react';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

type BreakType = 'break' | 'meal' | 'other';

interface BreakFormValues {
  breakType: BreakType;
  notes?: string;
}

interface BreakModalProps {
  visible: boolean;
  onCancel: () => void;
  onAction: (action: 'start' | 'end', breakType?: BreakType, breakNotes?: string) => void;
  isBreakActive: boolean;
}

export default function BreakModal({
  visible,
  onCancel,
  onAction,
  isBreakActive,
}: BreakModalProps) {
  const [form] = Form.useForm<BreakFormValues>();
  const [loading, setLoading] = useState<boolean>(false);

  const breakTypes: ReadonlyArray<{ value: BreakType; label: string }> = [
    { value: 'break', label: 'General Break' },
    { value: 'meal', label: 'Meal Break' },
    { value: 'other', label: 'Other' },
  ] as const;

  const handleConfirm = async (values?: BreakFormValues) => {
  setLoading(true);
  try {
    if (isBreakActive) {
      await onAction('end');
    } else {
      await onAction('start', values?.breakType ?? 'break', values?.notes);
    }
  } catch (error) {
    console.error('Break action failed:', error);
  } finally {
    setLoading(false);
  }
};

const handleEndBreak = async () => {
  setLoading(true);
  try {
    await onAction('end');
  } catch (error) {
    console.error('End break failed:', error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (visible && !isBreakActive) {
      form.resetFields();
    }
  }, [visible, isBreakActive, form]);

  if (isBreakActive) {
    return (
      <Modal
        title="End Break"
        open={visible}
        onCancel={onCancel}
        footer={[
          <Button key="cancel" onClick={onCancel}>
            Cancel
          </Button>,
          <Button key="action" type="primary" onClick={handleEndBreak} loading={loading}>
            End Break
          </Button>,
        ]}
      >
        <Text>Are you sure you want to end your current break?</Text>
      </Modal>
    );
  }

  return (
    <Modal title="Start Break" open={visible} onCancel={onCancel} footer={null}>
      <Form<BreakFormValues> form={form} onFinish={handleConfirm} layout="vertical">
        <Text className="block mb-4">Are you sure you want to start a break?</Text>

        <Form.Item<BreakFormValues> name="breakType" label="Break Type" initialValue="break">
          <Select placeholder="Select break type">
            {breakTypes.map((type) => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item<BreakFormValues> name="notes" label="Notes (optional)">
          <TextArea rows={2} placeholder="Any additional notes about this break..." />
        </Form.Item>

        <Form.Item>
          <div className="flex justify-end space-x-2">
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Start Break
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}
