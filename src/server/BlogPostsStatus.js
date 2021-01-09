import fetch from "node-fetch";
import { html } from "./utils.js";

/**
 * Widget to display blog posts status message.
 *
 * NOTE: the image for this gets fetched inside metalsmith.js file. So if you
 * get rid of this, get rid of that.
 *
 * @param {Array} allPosts - an array of all blog posts
 * @param {number} goal - number of posts you want to publish
 * @param {string} goalUrl - URL to the post that describes the goal for the year
 * @param {Date} moment - the point in time at which we render this, i.e 2020-10-01T01...
 *
 * @returns {string}
 */
export default async function BlogPostsStatus({
  allPosts,
  goal,
  goalUrl,
  moment,
}) {
  const year = moment.getUTCFullYear();
  const currentMonth = moment.getUTCMonth() + 1;
  const posts = allPosts.filter(
    // get everything from the moment's year (and before that month, which is
    // useful for when we want to draw a graph for a moment in the past)
    (post) => post.date.getUTCFullYear() === year && post.date <= moment
  );

  // prettier-ignore
  const monthlyPosts =
    // [0,0,0] each month is 0
    Array(currentMonth).fill(0)
    // [2,1,0] # of posts in each month
    .map(
      (postCount, i) =>
        posts.filter((post) => post.date.getUTCMonth() === i).length
    )
    // [2,3,3] summation of posts over months
    .reduce((acc, postCount, i) => {
      acc[i] = i === 0 ? postCount : acc[i - 1] + postCount;
      return acc;
    }, []);

  // get the trajectory based on dividing the goal by 12 months
  // end up with an addition of each, i.e. 24 posts goal for the year would be
  // [2,4,6,8,10,12,14,16,18,20,22,24]
  const monthlyGoal = [goal / 12];
  const monthlyTrajectory = [...Array(12)].map(
    (item, i) => (i + 1) * monthlyGoal
  );

  const graphData = {
    type: "line",
    data: {
      labels: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      datasets: [
        {
          label: `Goal (${goal})`,
          data: monthlyTrajectory,
          fill: true,
          borderColor: "rgba(255,38,3,.2)",
          backgroundColor: "rgba(255,38,3,.1)",
        },
        {
          label: `Actual (${posts.length})`,
          data: monthlyPosts,
          fill: false,
          borderColor: "rgba(255,38,3,1)",
        },
      ],
    },
    options: {
      devicePixelRatio: 2,
      title: {
        display: true,
        text: `Blog Posts in ${year}`,
      },
    },
  };

  // prettier-ignore
  const graphUrl = `https://quickchart.io/chart?c=${JSON.stringify(graphData).replace(/"/g, "'")}`;
  let img;
  try {
    await fetch(graphUrl)
      .then((res) => res.buffer())
      .then((imgData) => {
        // write to disk?
        img = imgData.toString("base64");
      });
  } catch (e) {
    console.log("Failed to fetch <BlogPostsStatus> image.", e);
  }

  return html`
    <style>
      .blog-posts {
        background: var(--color-bg-sidebar);
        border-radius: var(--border-radius);
        display: flex;
        align-items: flex-start;
        font-size: 0.7777rem;
        max-width: 50em;
      }
      .blog-posts summary,
      .blog-posts > div {
        position: relative;
        padding: 10px 15px;
      }
      .blog-posts[open] summary:after {
        content: "";
        width: calc(100% - 30px);
        height: 1px;
        position: absolute;
        bottom: 0;
        left: 15px;
        background: var(--color-border);
      }
      .blog-posts p {
        text-align: center;
        color: var(--color-text-light);
      }
    </style>

    <details class="blog-posts">
      <summary>
        <strong>${posts.length} posts in ${year}</strong>
        (<a href="${goalUrl}">my goal is ${goal}</a>). I expect you, dear
        reader, to
        <a href="https://twitter.com/jimniels">hold me accountable</a>.
      </summary>
      <div>
        ${img &&
        html`<img
          src="data:image/png;base64, ${img}"
          alt="A graph showing that I’ve published ${posts.length} posts this year through ${currentMonth} months."
        />`}
        <p>
          This shows my progress since my last published post.
          <a href="#">Read more on how I made this</a>.
        </p>
      </div>
    </details>
  `;
}
