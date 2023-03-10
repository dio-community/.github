
import dotenv from 'dotenv';

import path from 'path';
import { Liquid } from 'liquidjs'
import { writeFileSync } from 'fs';

import { GitHub } from "./gh";
import { Feeds } from "./rss";


export async function main() {
  dotenv.config();

  // Store dynamic data for templates
  let scope = {
    generated: new Date().toDateString(),
    gallery: new Array<String>,
    topics: new Array<[String, Number]>,
    languages: new Array<[String, Number]>,
  }

  // Get dynamic data from GitHub
  const gh = new GitHub();
  const org: string = process.env.ORG || '';

  const repos = await gh.getReposOverview(org);

  var topics: {[id: string]: number } = {};
  var languages: {[id: string]: number } = {};
  var gallery: {[id: string]: any } = {};

  for (let repo of repos.organization.repositories.edges) {

    // Count occurrences of each topic
    repo.node.repositoryTopics.edges.forEach((topic: any) => {
      if (topic.node.topic.name == 'github-gallery') {
        gallery[repo.node.name] = repo;
      } else {
        topics[topic.node.topic.name] = topic.node.topic.name in topics ? topics[topic.node.topic.name] + 1 : 1;
      }
    });

    // Count and include count of language used
    if (repo.node.primaryLanguage) {
      languages[repo.node.primaryLanguage.name] = repo.node.primaryLanguage.name in languages ? languages[repo.node.primaryLanguage.name] + 1 : 1;
    }
  }

  // Share topics sorted by frequency of use for filtering repositories
  // from the organization
  scope['topics'] = Object.entries(topics).sort(function (first, second) {
    return second[1] - first[1];
  });
  scope['languages'] = Object.entries(languages).sort(function (first, second) {
    return second[1] - first[1];
  });

  // Gather topics across repos
  scope['gallery'] = Object.values(gallery);

  /*
  const feeds = new Feeds();
  feed_url = `https://dolby.io/blog/author/${process.env.DOLBYIO_ID}/feed/`;
  const dolbyio = await feeds.getRecentArticles(feed_url);
  scope['dolbyio_post'] = dolbyio[0];
  */

  // Using liquid template engine to render files found in template dir
  // Learn more: https://liquidjs.com/
  const engine = new Liquid({
    root: path.resolve(__dirname, 'template/'),
    extname: '.liquid'
  })

  // Write the newly generated README file to disk
  engine.renderFile('README', scope).then((content) => {
      writeFileSync(path.join(__dirname, '../profile/README.md'), content, {
          flag: 'w'});
  });
}

main();