import type { ObjectId } from "mongodb";
import type { PublicChallenge } from "./challenge.model.js";

export interface TopicDocument {
  _id: ObjectId;
  courseId: ObjectId;
  title: string;
  slug: string;
  description: string;
  youtubeLink?: string;
  prerequisites: ObjectId[];
  level: string;
  editorTemplate?: string;
  challengeIds: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTopicInput {
  courseId: ObjectId;
  title: string;
  slug: string;
  description: string;
  youtubeLink?: string;
  prerequisites?: ObjectId[];
  level: string;
  editorTemplate?: string;
  challengeIds?: ObjectId[];
}

export interface UpdateTopicInput {
  title?: string;
  description?: string;
  youtubeLink?: string | null;
  prerequisites?: ObjectId[];
  level?: string;
  editorTemplate?: string | null;
  challengeIds?: ObjectId[];
}

export type PublicTopicSummary = {
  id: string;
  courseId: string;
  title: string;
  level: string;
  description: string;
  youtubeLink?: string;
  challengeCount: number;
};

export type PublicTopicDetail = {
  id: string;
  courseId: string;
  title: string;
  level: string;
  description: string;
  youtubeLink?: string;
  prerequisites: string[];
  editorTemplate?: string;
  challenges: PublicChallenge[];
};

export function mapTopicToSummary(
  topic: TopicDocument,
  challenges: number
): PublicTopicSummary {
  return {
    id: topic._id.toHexString(),
    courseId: topic.courseId.toHexString(),
    title: topic.title,
    level: topic.level,
    description: topic.description,
    youtubeLink: topic.youtubeLink,
    challengeCount: challenges,
  };
}

export function mapTopicToDetail(
  topic: TopicDocument,
  challenges: PublicChallenge[]
): PublicTopicDetail {
  return {
    id: topic._id.toHexString(),
    courseId: topic.courseId.toHexString(),
    title: topic.title,
    level: topic.level,
    description: topic.description,
    youtubeLink: topic.youtubeLink,
    prerequisites: topic.prerequisites.map((id) => id.toHexString()),
    editorTemplate: topic.editorTemplate,
    challenges,
  };
}
