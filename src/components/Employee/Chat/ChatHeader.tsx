import { IChatDocument } from '@/types/chat';
import Image from 'next/image';
import { FiMoreVertical, FiUsers, FiStar } from 'react-icons/fi';

interface ChatHeaderProps {
	chat: IChatDocument;
}

export default function ChatHeader({ chat }: ChatHeaderProps) {
	const getParticipantNames = () => {
		if (chat.isGroup) {
			return `${chat.members.length} members`;
		}
		return chat.participants?.map(p => (typeof p === 'object' ? (p as { name?: string }).name : '')).join(', ') || '';
	};

	const firstParticipantName =
		typeof chat.participants?.[0] === 'object'
			? ((chat.participants?.[0] as { name?: string })?.name ?? 'Chat')
			: 'Chat';

	return (
		<div className="flex items-center justify-between p-4 border-b">
			<div className="flex items-center">
				<div className="mr-3">
					{chat.avatar || (typeof chat.participants?.[0] === 'object' && (chat.participants?.[0] as { profileImage?: string })?.profileImage) ? (
						<Image
							src={(chat.avatar || (chat.participants?.[0] as { profileImage?: string })?.profileImage) as string}
							alt={chat.name || firstParticipantName}
							width={40}
							height={40}
							className="rounded-full object-cover"
						/>
					) : (
						<div className="w-10 h-10 rounded-full bg-gray-200" />
					)}
				</div>
				<div>
					<h2 className="font-semibold">{chat.name || firstParticipantName}</h2>
					<div className="flex items-center text-sm text-gray-500">
						{chat.isGroup ? (
							<>
								<FiUsers className="mr-1" />
								<span>{getParticipantNames()}</span>
							</>
						) : (
							<span>Online</span>
						)}
					</div>
				</div>
			</div>
			<div className="flex items-center space-x-4">
				<button className="text-gray-500 hover:text-yellow-500">
					<FiStar />
				</button>
				<button className="text-gray-500 hover:text-gray-700">
					<FiMoreVertical />
				</button>
			</div>
		</div>
	);
}