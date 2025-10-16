import type { ObjectId } from "mongodb";
import { mapChallengeToPublic } from "../../models/challenge.model.js";
import {
  mapCourseToDetail,
  mapCourseToSummary,
  type PublicCourseDetail,
  type PublicCourseSummary,
} from "../../models/course.model.js";
import {
  mapTopicToDetail,
  mapTopicToSummary,
  type PublicTopicDetail,
  type PublicTopicSummary,
  type TopicDocument,
} from "../../models/topic.model.js";
import { BadRequestError, NotFoundError } from "../../utils/http-errors.js";
import * as courseRepository from "../../repositories/course.repository.js";
import * as topicRepository from "../../repositories/topic.repository.js";
import * as challengeRepository from "../../repositories/challenge.repository.js";

export async function listPublishedCourses(): Promise<{
  courses: PublicCourseSummary[];
}> {
  const courses = await courseRepository.findPublishedCourses();
  const courseIds = courses.map((course) => course._id);
  const topicsByCourse = await topicRepository.findTopicsByCourseIds(courseIds);

  const summaries: PublicCourseSummary[] = [];

  for (const course of courses) {
    const topics = topicsByCourse[course._id.toHexString()] ?? [];
    summaries.push(mapCourseToSummary(course, topics));
  }

  return { courses: summaries };
}

export async function getCourseDetail(
  courseId: string
): Promise<PublicCourseDetail> {
  const course = await courseRepository.findCourseById(courseId);

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  if (course.status !== "published") {
    throw new BadRequestError("Course is not published");
  }

  const topics = await topicRepository.findTopicsByCourseId(course._id);
  const allTopicIds = topics.map((topic) => topic._id);
  const challengesByTopic = await challengeRepository.findChallengesByTopicIds(
    allTopicIds
  );

  const topicSummaries: PublicTopicSummary[] = topics.map((topic) => {
    const challenges = challengesByTopic[topic._id.toHexString()] ?? [];
    return mapTopicToSummary(topic, challenges.length);
  });

  const summary = mapCourseToSummary(course, topics);
  return mapCourseToDetail(summary, topicSummaries);
}

export async function getTopicDetail(
  courseId: string,
  topicId: string
): Promise<{
  course: PublicCourseSummary;
  topic: PublicTopicDetail;
}> {
  const [course, topic] = await Promise.all([
    courseRepository.findCourseById(courseId),
    topicRepository.findTopicById(topicId),
  ]);

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  if (!topic || !topic.courseId.equals(course._id)) {
    throw new NotFoundError("Topic not found for this course");
  }

  if (course.status !== "published") {
    throw new BadRequestError("Course is not published");
  }

  const topicsForCourse = await topicRepository.findTopicsByCourseId(
    course._id
  );
  const summary = mapCourseToSummary(course, topicsForCourse);

  const challenges = await challengeRepository.findChallengesByTopicId(
    topic._id
  );

  const publicChallenges = challenges.map(mapChallengeToPublic);
  const topicDetail = mapTopicToDetail(topic, publicChallenges);

  return {
    course: summary,
    topic: topicDetail,
  };
}

export async function ensureTopicsLinkedToCourse(
  courseId: ObjectId,
  topics: TopicDocument[]
) {
  const levelMap = new Map<string, ObjectId[]>();
  for (const topic of topics) {
    if (!levelMap.has(topic.level)) {
      levelMap.set(topic.level, []);
    }
    levelMap.get(topic.level)?.push(topic._id);
  }

  for (const [levelName, topicIds] of levelMap.entries()) {
    await courseRepository.addTopicsToLevel(courseId, levelName, topicIds);
  }
}
