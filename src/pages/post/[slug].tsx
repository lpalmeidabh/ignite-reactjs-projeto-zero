import { GetStaticPaths, GetStaticProps } from 'next';
import { RichText } from 'prismic-dom';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import Head from 'next/head';
import Link from 'next/link';
import Prismic from '@prismicio/client';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import {useUtterances} from '../../services/hooks/useUtterance'
import { getPrismicClient } from '../../services/prismic';
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  prev_post?: {
    uid: string;
    title: string;
  },
  next_post?: {
    uid: string;
    title: string;
  },
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const commentNodeId = 'comments';
  const Comments = () => {
    useUtterances(commentNodeId);
    return <div id={commentNodeId} />;
  };


  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  const formattedDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  );

  const wordCount = Math.ceil(
    post.data.content.reduce(
      (sum, contentItem) =>
        sum +
        contentItem.heading.match(/\w+/g).length +
        (contentItem.body
          ? contentItem.body.reduce(
              (partialSum, bodyItem) =>
                partialSum + bodyItem.text.match(/\w+/g).length,
              0
            )
          : 0),
      0
    ) / 200
  );

  return (
    <>
      <Head>
        <title>{post.data.title} | spacetraveling</title>
      </Head>
      <img src={post.data.banner.url} alt="" className={styles.banner} />
      <main className={commonStyles.container}>
        <div className={styles.post}>
          <div className={styles.postHeader}>
            <h1>{post.data.title}</h1>
            <div>
              <FiCalendar />
              <time>{formattedDate}</time>
              <FiUser />
              <span>{post.data.author}</span>
              <FiClock />
              <span>{`${wordCount} min`}</span>
              <span />
            </div>
          </div>

          {post.data.content.map(contentItem => (
            <article key={contentItem.heading} className={styles.postContent}>
              <h2>{contentItem.heading}</h2>
              <div
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(contentItem.body),
                }}
              />
            </article>
          ))}
        </div>
        <hr/>
        <div className={styles.lastNextPost}>
          {post.prev_post &&
          <div className={styles.lastPost}>
            <span>{post.prev_post.title}</span><br/>
             <Link href={`/post/${post.prev_post.uid}`} >
              <a>Post anterior</a>
             </Link>
          </div>
          }
          {post.next_post &&
            <div className={styles.nextPost}>
            <span>{post.next_post.title}</span><br />
             <Link href={`/post/${post.next_post.uid}`}>
              <a >Próximo post</a>
             </Link>
          </div>
          }

        </div>
        <section
          ref={elem => {
            if (!elem || elem.childNodes.length) {
              return;
            }
            const scriptElem = document.createElement("script");
            scriptElem.src = "https://utteranc.es/client.js";
            scriptElem.async = true;
            scriptElem.crossOrigin = "anonymous";
            scriptElem.setAttribute("repo", "lpalmeidabh/ignite-reactjs-projeto-zero");
            scriptElem.setAttribute("issue-term", "pathname");
            scriptElem.setAttribute("label", "blog-comment");
            scriptElem.setAttribute("theme", "github-dark");
            elem.appendChild(scriptElem);
          }}
        />
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const response = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: [],
    }
  );

  const posts = response.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths: posts,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const prismic = getPrismicClient();
  const { slug } = context.params;
  const response = await prismic.getByUID('posts', String(slug), {});

  const prev_post = (await prismic.query(Prismic.predicates.at('document.type', 'posts'), { pageSize : 1 , after : `${response.id}`, orderings: '[document.first_publication_date desc]'})).results[0]
  const next_post = (await prismic.query(Prismic.predicates.at('document.type', 'posts'), { pageSize : 1 , after : `${response.id}`, orderings: '[document.first_publication_date]'})).results[0]


  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    prev_post: prev_post ? {
      uid: prev_post.uid,
      title: prev_post.data.title,
    } : null,
    next_post: next_post ? {
      uid: next_post.uid,
      title: next_post.data.title,
    } : null,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  return {
    props: {
      post,
    },
  };
};
